import {
  fetchVideoInfo,
  fetchPlayUrlPromise,
  fetchFavList,
  fetchBiliSeriesInfo,
  fetchBiliColleList,
  fetchFavBvids,
  fetchBiliSeriesBvids,
  fetchBiliColleBvids,
} from '../utils/Data';
import Song from '../objects/Song';
import { browserApi } from '../platform/browserApi';

const DEFAULT_BVID = 'BV1BQ4y1X714';
const LAST_PLAY_LIST = 'LastPlayList';

type VideoPage = { cid: string; bvid: string; part: string };
type VideoInfoLike = {
  title: string;
  picSrc: string;
  uploader: { name: string; mid: string | number };
  pages: VideoPage[];
};
type SongLike = { bvid?: string };
export type RefreshProgress = {
  processed: number;
  total: number;
  failedCount: number;
};
export type RefreshFromSourceResult = {
  songs: Song[];
  processed: number;
  total: number;
  failedCount: number;
  failedBvids: string[];
};

export type SearchSource =
  | { type: 'bvid'; bvid: string }
  | { type: 'fav'; mid: string }
  | { type: 'series'; mid: string; sid: string }
  | { type: 'collection'; mid: string; sid: string };

export const initSongList = async (setCurrentSongList: (songs: Song[]) => void) => {
  browserApi.storage.local.get([LAST_PLAY_LIST], async function (result) {
    const lastPlayList = result[LAST_PLAY_LIST] as Song[] | undefined;
    if (lastPlayList && lastPlayList.length !== 0) {
      lastPlayList.forEach((v: any) => {
        v.musicSrc = () => fetchPlayUrlPromise(v.bvid, v.id);
      });
      setCurrentSongList(lastPlayList);
      return;
    }

    const defaultSongList = await getSongList(DEFAULT_BVID);
    setCurrentSongList(defaultSongList);
  });
};

export const getSongList = async (bvid: string): Promise<Song[]> => {
  const info = (await fetchVideoInfo(bvid)) as VideoInfoLike | undefined;
  if (!info) return [];

  const lrc = '';
  if (info.pages.length === 1) {
    return [
      new Song({
        cid: String(info.pages[0].cid),
        bvid,
        name: info.title,
        singer: info.uploader.name,
        singerId: info.uploader.mid,
        cover: info.picSrc,
        musicSrc: () => fetchPlayUrlPromise(bvid, info.pages[0].cid),
        lyric: lrc,
      }),
    ];
  }

  const songs: Song[] = [];
  for (const page of info.pages) {
    songs.push(
      new Song({
        cid: String(page.cid),
        bvid,
        name: page.part,
        singer: info.uploader.name,
        singerId: info.uploader.mid,
        cover: info.picSrc,
        musicSrc: () => fetchPlayUrlPromise(bvid, page.cid),
        lyric: lrc,
      }),
    );
  }

  return songs;
};

const getSongsFromBVids = async (infos: (VideoInfoLike | undefined)[], strict = false): Promise<Song[]> => {
  if (strict && infos.some((info) => !info)) {
    throw new Error('Failed to load the complete source playlist.');
  }

  const songs: Song[] = [];

  infos.forEach((info) => {
    if (!info) return;

    if (info.pages.length === 1) {
      songs.push(
        new Song({
          cid: String(info.pages[0].cid),
          bvid: info.pages[0].bvid,
          name: info.title,
          singer: info.uploader.name,
          singerId: info.uploader.mid,
          cover: info.picSrc,
          musicSrc: () => fetchPlayUrlPromise(info.pages[0].bvid, info.pages[0].cid),
        }),
      );
      return;
    }

    for (const page of info.pages) {
      songs.push(
        new Song({
          cid: String(page.cid),
          bvid: page.bvid,
          name: page.part,
          singer: info.uploader.name,
          singerId: info.uploader.mid,
          cover: info.picSrc,
          musicSrc: () => fetchPlayUrlPromise(page.bvid, page.cid),
        }),
      );
    }
  });

  return songs;
};

const groupSongsByBvid = (songs: SongLike[] = []): Map<string, Song[]> => {
  const grouped = new Map<string, Song[]>();

  songs.forEach((song) => {
    const bvid = String(song?.bvid || '');
    if (!bvid) return;
    if (!grouped.has(bvid)) {
      grouped.set(bvid, []);
    }
    grouped.get(bvid)?.push(song as Song);
  });

  return grouped;
};

const fetchSongsByBvidMap = async (bvids: string[]): Promise<Map<string, Song[]>> => {
  const uniqueBvids = Array.from(new Set(bvids.filter(Boolean)));
  const entries = await Promise.all(
    uniqueBvids.map(async (bvid) => {
      const songs = await getSongList(bvid);
      if (!songs.length) {
        throw new Error(`Failed to load source video ${bvid}.`);
      }
      return [bvid, songs] as const;
    }),
  );

  return new Map(entries);
};

const rebuildSongsFromSourceBvids = async (sourceBvids: string[], existingSongs: SongLike[] = []): Promise<Song[]> => {
  const orderedBvids = sourceBvids.map((bvid) => String(bvid || '')).filter(Boolean);
  const existingByBvid = groupSongsByBvid(existingSongs);
  const missingBvids = Array.from(new Set(orderedBvids.filter((bvid) => !(existingByBvid.get(bvid)?.length))));
  const fetchedByBvid = missingBvids.length ? await fetchSongsByBvidMap(missingBvids) : new Map<string, Song[]>();

  const songs: Song[] = [];
  for (const bvid of orderedBvids) {
    const matchedSongs = existingByBvid.get(bvid) || fetchedByBvid.get(bvid);
    if (!matchedSongs?.length) {
      throw new Error('Failed to load the complete source playlist.');
    }
    songs.push(...matchedSongs);
  }

  return songs;
};

const getSourceOrderedBvids = async (source: SearchSource): Promise<string[]> => {
  switch (source.type) {
    case 'bvid':
      return [source.bvid];
    case 'fav':
      return fetchFavBvids(source.mid);
    case 'series':
      return fetchBiliSeriesBvids(source.mid, source.sid);
    case 'collection':
      return fetchBiliColleBvids(source.mid, source.sid);
    default:
      return [];
  }
};

export const refreshSongsFromSource = async (
  source: SearchSource,
  existingSongs: SongLike[] = [],
  onProgress?: (progress: RefreshProgress) => void,
): Promise<RefreshFromSourceResult> => {
  const sourceBvids = (await getSourceOrderedBvids(source)).map((bvid) => String(bvid || '')).filter(Boolean);
  const orderedUniqueBvids = Array.from(new Set(sourceBvids));
  const total = orderedUniqueBvids.length;
  const existingByBvid = groupSongsByBvid(existingSongs);
  const resolvedByBvid = new Map<string, Song[]>();
  const failedBvids: string[] = [];
  let processed = 0;

  onProgress?.({ processed, total, failedCount: 0 });

  for (const bvid of orderedUniqueBvids) {
    const existingGroup = existingByBvid.get(bvid);
    if (existingGroup?.length) {
      resolvedByBvid.set(bvid, existingGroup);
      processed += 1;
      onProgress?.({ processed, total, failedCount: failedBvids.length });
      continue;
    }

    const fetchedSongs = await getSongList(bvid).catch(() => []);
    if (fetchedSongs.length) {
      resolvedByBvid.set(bvid, fetchedSongs);
    } else {
      failedBvids.push(bvid);
    }
    processed += 1;
    onProgress?.({ processed, total, failedCount: failedBvids.length });
  }

  const songs: Song[] = [];
  for (const bvid of orderedUniqueBvids) {
    const matchedSongs = resolvedByBvid.get(bvid);
    if (matchedSongs?.length) {
      songs.push(...matchedSongs);
    }
  }

  return {
    songs,
    processed,
    total,
    failedCount: failedBvids.length,
    failedBvids,
  };
};

export const getBiliSeriesList = async (mid: string, sid: string): Promise<Song[]> => {
  return getSongsFromBVids(await fetchBiliSeriesInfo(mid, sid));
};

export const getFavList = async (mid: string): Promise<Song[]> => {
  return getSongsFromBVids(await fetchFavList(mid));
};

export const getBiliColleList = async (mid: string, sid: string, favList: string[] = []): Promise<Song[]> => {
  return getSongsFromBVids(await fetchBiliColleList(mid, sid, favList));
};

export const getSongsFromSource = async (source: SearchSource, existingSongs: SongLike[] = []): Promise<Song[]> => {
  switch (source.type) {
    case 'bvid':
      {
        const songs = await getSongList(source.bvid);
        if (!songs.length) {
          throw new Error('Failed to load the source video.');
        }
        return songs;
      }
    case 'fav':
      return rebuildSongsFromSourceBvids(await fetchFavBvids(source.mid), existingSongs);
    case 'series':
      return rebuildSongsFromSourceBvids(await fetchBiliSeriesBvids(source.mid, source.sid), existingSongs);
    case 'collection':
      return rebuildSongsFromSourceBvids(await fetchBiliColleBvids(source.mid, source.sid), existingSongs);
    default:
      return [];
  }
};
