import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/utils/Data', () => {
  return {
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
  };
});

import { getSongList, getFavList } from '../src/background/DataProcess';

describe('DataProcess song assembly', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
