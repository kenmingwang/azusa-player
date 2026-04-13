import { describe, it, expect, vi, beforeEach } from 'vitest';

const dataMocks = vi.hoisted(() => ({
  fetchVideoInfo: vi.fn(async (bvid: string) => {
    if (bvid === 'BV_MULTI') {
      return {
        title: 'multi title',
        picSrc: 'cover',
        uploader: { name: 'up', mid: 7 },
        pages: [
          { cid: 'c1', bvid: 'BV_MULTI', part: 'part1' },
          { cid: 'c2', bvid: 'BV_MULTI', part: 'part2' },
        ],
      };
    }
    return {
      title: 'single title',
      picSrc: 'cover',
      uploader: { name: 'up', mid: 8 },
      pages: [{ cid: 'single-cid', bvid, part: 'single' }],
    };
  }),
  fetchPlayUrlPromise: vi.fn(async (bvid: string, cid: string) => `url-${bvid}-${cid}`),
  fetchFavList: vi.fn(async () => [
    {
      title: 'fav info',
      picSrc: 'cover',
      uploader: { name: 'fav-up', mid: 9 },
      pages: [{ cid: 'fav-cid', bvid: 'BV_FAV', part: 'fav-part' }],
    },
  ]),
  fetchBiliSeriesInfo: vi.fn(async () => []),
  fetchBiliColleList: vi.fn(async () => []),
  fetchFavBvids: vi.fn(async () => ['BV_FAV']),
  fetchBiliSeriesBvids: vi.fn(async () => []),
  fetchBiliColleBvids: vi.fn(async () => []),
}));

vi.mock('../src/utils/Data', () => {
  return {
    fetchVideoInfo: dataMocks.fetchVideoInfo,
    fetchPlayUrlPromise: dataMocks.fetchPlayUrlPromise,
    fetchFavList: dataMocks.fetchFavList,
    fetchBiliSeriesInfo: dataMocks.fetchBiliSeriesInfo,
    fetchBiliColleList: dataMocks.fetchBiliColleList,
    fetchFavBvids: dataMocks.fetchFavBvids,
    fetchBiliSeriesBvids: dataMocks.fetchBiliSeriesBvids,
    fetchBiliColleBvids: dataMocks.fetchBiliColleBvids,
  };
});

import { getSongList, getFavList, getSongsFromSource, refreshSongsFromSource } from '../src/background/DataProcess';

describe('DataProcess song assembly', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dataMocks.fetchVideoInfo.mockImplementation(async (bvid: string) => {
      if (bvid === 'BV_MULTI') {
        return {
          title: 'multi title',
          picSrc: 'cover',
          uploader: { name: 'up', mid: 7 },
          pages: [
            { cid: 'c1', bvid: 'BV_MULTI', part: 'part1' },
            { cid: 'c2', bvid: 'BV_MULTI', part: 'part2' },
          ],
        };
      }
      return {
        title: 'single title',
        picSrc: 'cover',
        uploader: { name: 'up', mid: 8 },
        pages: [{ cid: 'single-cid', bvid, part: 'single' }],
      };
    });
    dataMocks.fetchFavList.mockResolvedValue([
      {
        title: 'fav info',
        picSrc: 'cover',
        uploader: { name: 'fav-up', mid: 9 },
        pages: [{ cid: 'fav-cid', bvid: 'BV_FAV', part: 'fav-part' }],
      },
    ]);
    dataMocks.fetchFavBvids.mockResolvedValue(['BV_FAV']);
  });

  it('builds songs for multipart videos', async () => {
    const songs = await getSongList('BV_MULTI');
    expect(songs).toHaveLength(2);
    expect(songs[0].name).toBe('part1');
    expect(songs[1].name).toBe('part2');
  });

  it('builds songs from favorite list infos', async () => {
    const songs = await getFavList('MID_FAV');
    expect(songs).toHaveLength(1);
    expect(songs[0].bvid).toBe('BV_FAV');
    expect(songs[0].name).toBe('fav info');
  });

  it('reuses existing songs for unchanged bvids and only fetches new bvid details', async () => {
    dataMocks.fetchFavBvids.mockResolvedValue(['BV_OLD', 'BV_NEW', 'BV_MULTI']);
    const existingSongs = [
      {
        id: 'old-cid',
        bvid: 'BV_OLD',
        name: 'old local song',
        singer: 'old up',
        singerId: 1,
        cover: 'cover-old',
        musicSrc: 'cached-old',
      },
      {
        id: 'multi-c1',
        bvid: 'BV_MULTI',
        name: 'local part1',
        singer: 'local up',
        singerId: 7,
        cover: 'cover-multi',
        musicSrc: 'cached-m1',
      },
      {
        id: 'multi-c2',
        bvid: 'BV_MULTI',
        name: 'local part2',
        singer: 'local up',
        singerId: 7,
        cover: 'cover-multi',
        musicSrc: 'cached-m2',
      },
    ];

    const songs = await getSongsFromSource({ type: 'fav', mid: 'MID_FAV' }, existingSongs as any);

    expect(dataMocks.fetchFavBvids).toHaveBeenCalledWith('MID_FAV');
    expect(dataMocks.fetchVideoInfo).toHaveBeenCalledTimes(1);
    expect(dataMocks.fetchVideoInfo).toHaveBeenCalledWith('BV_NEW');
    expect(songs.map((song) => song.bvid)).toEqual(['BV_OLD', 'BV_NEW', 'BV_MULTI', 'BV_MULTI']);
    expect(songs.map((song) => song.name)).toEqual(['old local song', 'single title', 'local part1', 'local part2']);
  });

  it('keeps successful songs and reports failures during incremental source refresh', async () => {
    dataMocks.fetchFavBvids.mockResolvedValue(['BV_FAV', 'BV_MISSING']);
    dataMocks.fetchVideoInfo.mockImplementation(async (bvid: string) => {
      if (bvid === 'BV_MISSING') {
        return undefined;
      }
      return {
        title: 'single title',
        picSrc: 'cover',
        uploader: { name: 'up', mid: 8 },
        pages: [{ cid: 'single-cid', bvid, part: 'single' }],
      };
    });

    const progressUpdates: Array<{ processed: number; total: number; failedCount: number }> = [];
    const result = await refreshSongsFromSource(
      { type: 'fav', mid: 'MID_FAV' },
      [{ id: 'fav-cid', bvid: 'BV_FAV', name: 'fav info', singer: 'fav-up', singerId: 9, cover: 'cover', musicSrc: 'cached' }] as any,
      (progress) => progressUpdates.push(progress),
    );

    expect(result.songs.map((song) => song.bvid)).toEqual(['BV_FAV']);
    expect(result.failedCount).toBe(1);
    expect(result.failedBvids).toEqual(['BV_MISSING']);
    expect(progressUpdates[progressUpdates.length - 1]).toEqual({ processed: 2, total: 2, failedCount: 1 });
  });
});
