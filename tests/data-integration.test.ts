import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchFavList, fetchPlayUrlPromise, searchLyric } from '../src/utils/Data';

const mockJsonResponse = (payload: any) => ({
  json: vi.fn().mockResolvedValue(payload),
  ok: true,
});

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
