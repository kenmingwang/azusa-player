import { fetchVideoInfo, fetchPlayUrlPromise, fetchFavList, fetchBiliSeriesInfo, fetchBiliColleList } from '../utils/Data';
import Song from '../objects/Song';

const DEFAULT_BVID = 'BV1BQ4y1X714';
const LAST_PLAY_LIST = 'LastPlayList';

type VideoPage = { cid: string; bvid: string; part: string };
type VideoInfoLike = {
  title: string;
  picSrc: string;
  uploader: { name: string; mid: string | number };
  pages: VideoPage[];
};

export const initSongList = async (setCurrentSongList: (songs: Song[]) => void) => {
  chrome.storage.local.get([LAST_PLAY_LIST], async function (result) {
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

const getSongsFromBVids = async (infos: (VideoInfoLike | undefined)[]): Promise<Song[]> => {
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

export const getBiliSeriesList = async (mid: string, sid: string): Promise<Song[]> => {
  return getSongsFromBVids(await fetchBiliSeriesInfo(mid, sid));
};

export const getFavList = async (mid: string): Promise<Song[]> => {
  return getSongsFromBVids(await fetchFavList(mid));
};

export const getBiliColleList = async (mid: string, sid: string, favList: string[] = []): Promise<Song[]> => {
  return getSongsFromBVids(await fetchBiliColleList(mid, sid, favList));
};

