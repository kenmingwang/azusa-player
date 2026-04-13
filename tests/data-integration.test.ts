import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchBiliColleList, fetchFavList, fetchPlayUrlPromise, searchLyric } from '../src/utils/Data';

const mockJsonResponse = (payload: any, init: { contentType?: string; ok?: boolean } = {}) => {
  const contentType = init.contentType ?? 'application/json; charset=utf-8';
  return {
    json: vi.fn().mockResolvedValue(payload),
    text: vi.fn().mockResolvedValue(JSON.stringify(payload)),
    headers: {
      get: vi.fn((name: string) => (name.toLowerCase() === 'content-type' ? contentType : null)),
    },
    ok: init.ok ?? true,
  };
};

describe('Data integration behaviors', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    (globalThis as any).chrome = {
      storage: {
        local: {
          get: vi.fn((keys: any, cb: (result: any) => void) => {
            cb({ CurrentPlaying: {}, PlayerSetting: { playMode: 'order' } });
          }),
        },
      },
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetchFavList includes videos from the last page', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/x/v3/fav/resource/list') && url.includes('pn=1')) {
        return mockJsonResponse({
          data: {
            info: { media_count: 21 },
            medias: [{ bvid: 'BV_FIRST' }],
          },
        });
      }

      if (url.includes('/x/v3/fav/resource/list') && url.includes('pn=2')) {
        return mockJsonResponse({
          data: {
            medias: [{ bvid: 'BV_LAST_PAGE' }],
          },
        });
      }

      if (url.includes('/x/web-interface/view?bvid=BV_FIRST')) {
        return mockJsonResponse({
          data: {
            title: 'first',
            desc: '',
            videos: 1,
            pic: 'cover',
            owner: { name: 'u1', mid: 1 },
            pages: [{ part: 'p1', cid: 'c1' }],
          },
        });
      }

      if (url.includes('/x/web-interface/view?bvid=BV_LAST_PAGE')) {
        return mockJsonResponse({
          data: {
            title: 'last',
            desc: '',
            videos: 1,
            pic: 'cover',
            owner: { name: 'u2', mid: 2 },
            pages: [{ part: 'p2', cid: 'c2' }],
          },
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock as any);

    const infos = await fetchFavList('MID_1');
    const titles = infos.filter(Boolean).map((v: any) => v.title);

    expect(titles).toContain('first');
    expect(titles).toContain('last');
  });

  it('fetchFavList rejects bilibili risk-control responses instead of treating them as empty results', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/x/v3/fav/resource/list')) {
        return mockJsonResponse({
          code: -412,
          message: 'The request was rejected because of the bilibili security control policy.',
          data: null,
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock as any);

    await expect(fetchFavList('MID_RISK')).rejects.toThrow('The request was rejected because of the bilibili security control policy.');
  });

  it('fetchBiliColleList uses the web-space season endpoint', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/x/polymer/web-space/seasons_archives_list') && url.includes('page_num=1')) {
        return mockJsonResponse({
          data: {
            meta: { total: 1 },
            page: { page_size: 30 },
            archives: [{ bvid: 'BV_SEASON_1' }],
          },
        });
      }

      if (url.includes('/x/web-interface/view?bvid=BV_SEASON_1')) {
        return mockJsonResponse({
          data: {
            title: 'season-item',
            desc: '',
            videos: 1,
            pic: 'cover',
            owner: { name: 'u-season', mid: 3 },
            pages: [{ part: 'p-season', cid: 'c-season' }],
          },
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock as any);

    const infos = await fetchBiliColleList('896830', '3149109');
    const titles = infos.filter(Boolean).map((v: any) => v.title);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/x/polymer/web-space/seasons_archives_list?mid=896830&season_id=3149109'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: 'application/json, text/plain, */*',
        }),
      }),
    );
    expect(titles).toEqual(['season-item']);
  });

  it('fetchPlayUrlPromise prefers selected dash audio and uses cache when possible', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/x/player/playurl')) {
        return mockJsonResponse({
          data: {
            dash: {
              audio: [
                { id: 1, bandwidth: 100, codecs: 'aac', baseUrl: 'low-url' },
                { id: 2, bandwidth: 200, codecs: 'mp4a.40.2', baseUrl: 'high-url' },
              ],
            },
          },
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock as any);

    const url = await fetchPlayUrlPromise('BV_X', 'CID_X');
    expect(url).toBe('high-url');

    ((globalThis as any).chrome.storage.local.get as any).mockImplementationOnce((keys: any, cb: (result: any) => void) => {
      cb({
        CurrentPlaying: { cid: 'CID_CACHE', playUrl: 'cached-url' },
        PlayerSetting: { playMode: 'order' },
      });
    });

    const cachedUrl = await fetchPlayUrlPromise('BV_X', 'CID_CACHE');
    expect(cachedUrl).toBe('cached-url');
  });

  it('searchLyric returns fallback message when lyric does not exist', async () => {
    const fetchMock = vi.fn(async () => mockJsonResponse({}));
    vi.stubGlobal('fetch', fetchMock as any);

    let lyric = '';
    await searchLyric('MID_NONE', (v: string) => {
      lyric = v;
    });

    expect(lyric).toContain('无法找到歌词');
  });
});
