import { getSongList } from '../background/DataProcess';
import { v4 as uuidv4 } from 'uuid';
import type { SearchSource } from '../background/DataProcess';
import { fetchPlayUrlPromise } from '../utils/Data';
import Song from './Song';
import { browserApi, isExtensionRuntime } from '../platform/browserApi';

const INITIAL_PLAYLIST = 'BV1wr4y1v7TA';
const MY_FAV_LIST_KEY = 'MyFavList';
const LYRIC_MAPPING = 'LyricMappings';
const LAST_PLAY_LIST = 'LastPlayList';
const PLAYER_SETTINGS = 'PlayerSetting';
const SYNC_FAV_LIST_KEY = 'MyFavListSync';

export interface PlayList {
  songList: Song[];
  info: {
    title: string;
    id: string;
    currentTableInfo?: Record<string, unknown>;
    source?: SearchSource;
  };
}

export interface LyricDetail {
  key: string;
  id: string;
  lrc: any;
  lrcOffset: number;
}

interface SyncFavPayload {
  ids: string[];
  lists: Array<{
    info: PlayList['info'];
    songList: Array<{
      id: string;
      bvid: string;
      name: string;
      singer: string;
      singerId: string | number;
      cover: string;
      lyric?: string;
      lyricOffset?: number;
    }>;
  }>;
}

export default class StorageManager {
  private static instance: StorageManager;
  public setFavLists: (lists: PlayList[]) => void;
  public latestFavLists: PlayList[];
  private hasWarnedSyncQuotaExceeded: boolean;

  private constructor() {
    this.setFavLists = () => {};
    this.latestFavLists = [];
    this.hasWarnedSyncQuotaExceeded = false;
  }

  public static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  private hydrateSongs(songList: any[] = []): Song[] {
    return songList.map((v: any) => {
      const song: any = { ...v };
      song.musicSrc = () => fetchPlayUrlPromise(song.bvid, song.id);
      return song as Song;
    });
  }

  private async syncFavListsToCloud() {
    const payload: SyncFavPayload = {
      ids: this.latestFavLists.map((v) => v.info.id),
      lists: this.latestFavLists.map((list) => ({
        info: list.info,
        songList: list.songList.map((s: any) => ({
          id: s.id,
          bvid: s.bvid,
          name: s.name,
          singer: s.singer,
          singerId: s.singerId,
          cover: s.cover,
          lyric: s.lyric,
          lyricOffset: s.lyricOffset,
        })),
      })),
    };

    const quotaPerItem = Number((browserApi.storage.sync as any)?.QUOTA_BYTES_PER_ITEM ?? 8192);
    const estimatedBytes = new TextEncoder().encode(JSON.stringify({ [SYNC_FAV_LIST_KEY]: payload })).length;

    if (estimatedBytes > quotaPerItem) {
      if (!this.hasWarnedSyncQuotaExceeded) {
        console.warn(
          `sync storage skipped: playlist payload ${estimatedBytes}B exceeds per-item quota ${quotaPerItem}B`,
        );
        this.hasWarnedSyncQuotaExceeded = true;
      }
      return;
    }

    browserApi.storage.sync.set({ [SYNC_FAV_LIST_KEY]: payload }, () => {
      if (browserApi.runtime.lastError) {
        console.warn('sync storage warning:', browserApi.runtime.lastError.message);
        return;
      }
      this.hasWarnedSyncQuotaExceeded = false;
    });
  }

  private async restoreFromSyncIfNeeded(): Promise<boolean> {
    return new Promise((resolve) => {
      browserApi.storage.sync.get([SYNC_FAV_LIST_KEY], (result) => {
        const syncData = result?.[SYNC_FAV_LIST_KEY] as SyncFavPayload | undefined;
        if (!syncData?.ids?.length || !syncData?.lists?.length) {
          resolve(false);
          return;
        }

        const localObj: Record<string, PlayList> = {};
        syncData.lists.forEach((list) => {
          localObj[list.info.id] = {
            info: list.info,
            songList: this.hydrateSongs(list.songList as any),
          };
        });

        browserApi.storage.local.set(
          {
            [MY_FAV_LIST_KEY]: syncData.ids,
            [LYRIC_MAPPING]: [],
            [LAST_PLAY_LIST]: [],
            ...localObj,
          },
          () => {
            this.latestFavLists = syncData.ids
              .map((id) => localObj[id])
              .filter(Boolean);
            this.setFavLists([...this.latestFavLists]);

            if (isExtensionRuntime()) {
              browserApi.runtime.sendMessage({
                type: 'fav-lists-change',
                data: this.latestFavLists.map((v) => v.info),
              });
            }
            resolve(true);
          },
        );
      });
    });
  }

  async initFavLists(): Promise<void> {
    const ids = (await this.readLocalStorage(MY_FAV_LIST_KEY)) as string[] | undefined;

    if (Array.isArray(ids) && ids.length > 0) {
      await this.initWithStorage(ids);
      return;
    }

    const restored = await this.restoreFromSyncIfNeeded();
    if (restored) return;

    browserApi.storage.local.set({ [MY_FAV_LIST_KEY]: [] }, async () => {
      await this.initWithDefault();
    });
  }

  async initWithStorage(favListIDs: string[]) {
    browserApi.storage.local.get(favListIDs, (result) => {
      const favLists: PlayList[] = [];
      const favListsSorted: PlayList[] = [];

      for (const value of Object.values(result)) {
        const list = value as PlayList;
        list.songList = this.hydrateSongs(list.songList as any);
        favLists.push(list);
      }

      favListIDs.forEach((id) => {
        const found = favLists.find((v) => v.info.id == id);
        if (found) favListsSorted.push(found);
      });

      this.setFavLists(favListsSorted);
      this.latestFavLists = favListsSorted;
    });
  }

  async initWithDefault() {
    const songList = await getSongList(INITIAL_PLAYLIST);
    const value: PlayList = {
      songList,
      info: { title: 'Azusa 默认歌单', id: `FavList-${uuidv4()}` },
    };

    browserApi.storage.local.set(
      {
        [value.info.id]: value,
        [LAST_PLAY_LIST]: [],
        [LYRIC_MAPPING]: [],
      },
      () => {
        browserApi.storage.local.set({ [MY_FAV_LIST_KEY]: [value.info.id] }, () => {
          this.setFavLists([value]);
          this.latestFavLists = [value];
          this.syncFavListsToCloud();

          if (isExtensionRuntime()) {
            browserApi.runtime.sendMessage({
              type: 'fav-lists-change',
              data: this.latestFavLists.map((v) => v.info),
            });
          }
        });
      },
    );
  }

  deleteFavList(id: string, newFavLists: PlayList[]) {
    browserApi.storage.local.remove(id, () => {
      const newFavListIds = newFavLists.map((v) => v.info.id);
      browserApi.storage.local.set({ [MY_FAV_LIST_KEY]: newFavListIds }, () => {
        this.setFavLists(newFavLists);
        this.latestFavLists = newFavLists;
        this.syncFavListsToCloud();

        if (isExtensionRuntime()) {
          browserApi.runtime.sendMessage({
            type: 'fav-lists-change',
            data: this.latestFavLists.map((v) => v.info),
          });
        }
      });
    });
  }

  addFavList(favName: string): PlayList {
    const value: PlayList = {
      songList: [],
      info: { title: favName, id: `FavList-${uuidv4()}` },
    };

    browserApi.storage.local.set({ [value.info.id]: value }, () => {
      this.latestFavLists.push(value);
      const newListIDs = this.latestFavLists.map((v) => v.info.id);
      browserApi.storage.local.set({ [MY_FAV_LIST_KEY]: newListIDs }, () => {
        this.setFavLists([...this.latestFavLists]);
        this.syncFavListsToCloud();

        if (isExtensionRuntime()) {
          browserApi.runtime.sendMessage({
            type: 'fav-lists-change',
            data: this.latestFavLists.map((v) => v.info),
          });
        }
      });
    });
    return value;
  }

  updateFavList(updatedToList: PlayList) {
    browserApi.storage.local.set({ [updatedToList.info.id]: updatedToList }, () => {
      const index = this.latestFavLists.findIndex((f) => f.info.id == updatedToList.info.id);
      if (index !== -1) {
        this.latestFavLists[index] = {
          info: { ...updatedToList.info },
          songList: this.hydrateSongs(updatedToList.songList as any),
        };
        this.setFavLists([...this.latestFavLists]);
        this.syncFavListsToCloud();
      }
    });
  }

  setLastPlayList(audioLists: Song[]) {
    browserApi.storage.local.set({ [LAST_PLAY_LIST]: audioLists });
  }

  async setLyricOffset(songId: string, lrcOffset: number) {
    const lyricMappings = ((await this.readLocalStorage(LYRIC_MAPPING)) || []) as LyricDetail[];
    const detailIndex = lyricMappings.findIndex((l) => l.id == songId);
    if (detailIndex != -1) {
      lyricMappings[detailIndex].lrcOffset = lrcOffset;
      browserApi.storage.local.set({ [LYRIC_MAPPING]: lyricMappings });
    }
  }

  async setLyricDetail(songId: string, lrc: any) {
    const lyricMappings = ((await this.readLocalStorage(LYRIC_MAPPING)) || []) as LyricDetail[];
    const detailIndex = lyricMappings.findIndex((l) => l.id == songId);
    if (detailIndex != -1) {
      lyricMappings[detailIndex].lrc = lrc;
    } else {
      lyricMappings.push({ key: songId, id: songId, lrc, lrcOffset: 0 });
    }
    browserApi.storage.local.set({ [LYRIC_MAPPING]: lyricMappings });
  }

  async getLyricDetail(songId: string): Promise<LyricDetail | undefined> {
    const lyricMappings = (await this.readLocalStorage(LYRIC_MAPPING)) as LyricDetail[];
    if (!lyricMappings) return undefined;
    return lyricMappings.find((l) => l.id == songId);
  }

  async readLocalStorage(key: string): Promise<any> {
    return new Promise((resolve) => {
      browserApi.storage.local.get([key], (result) => {
        resolve(result[key]);
      });
    });
  }

  async getPlayerSetting() {
    return this.readLocalStorage(PLAYER_SETTINGS);
  }

  async setPlayerSetting(newSettings: any) {
    browserApi.storage.local.set({ [PLAYER_SETTINGS]: newSettings });
  }

  async exportStorage() {
    browserApi.storage.local.get(null, (items) => {
      const result = JSON.stringify(items);
      const bytes = new TextEncoder().encode(result);
      const blob = new Blob([bytes], {
        type: 'application/json;charset=utf-8',
      });
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = `AzusaPlayerStorage_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(href);
    });
  }

  async importStorage() {
    const upload = document.createElement('input');
    upload.type = 'file';
    document.body.appendChild(upload);

    upload.addEventListener(
      'change',
      () => {
        if (upload.files && upload.files[0]) {
          const fileReader = new FileReader();
          fileReader.onload = () => {
            if (typeof fileReader.result === 'string') {
              const parsedJSON = JSON.parse(fileReader.result);
              browserApi.storage.local.clear(() => {
                browserApi.storage.local.set(parsedJSON, () => {
                  this.initFavLists();
                });
              });
            }
          };
          fileReader.readAsText(upload.files[0]);
        }
      },
      false,
    );
    upload.click();
    document.body.removeChild(upload);
  }
}

