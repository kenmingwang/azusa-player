import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { cleanSearchTitle, searchBilibiliVideos } from '../src/utils/videoSearch';

const fetchMock = vi.fn();
const navMock = vi.fn();
const response = (json: unknown, status = 200, contentType = 'application/json') => ({
  ok: status >= 200 && status < 300,
  status,
  headers: new Headers({ 'content-type': contentType }),
  json: async () => json,
});
const video = { type: 'video', bvid: 'BV1yNPbzjEVq', title: '<em class="keyword">晴天</em> &amp; Live', author: 'UP主', pic: '//i0.hdslb.com/cover.jpg', duration: '4:30', play: 1234 };

beforeEach(() => {
  fetchMock.mockReset();
  navMock.mockReset();
  navMock.mockResolvedValue(response({ code: -101, data: { wbi_img: {
    img_url: 'https://i0.hdslb.com/bfs/wbi/7cd084941338484aae1ad9425b84077c.png',
    sub_url: 'https://i0.hdslb.com/bfs/wbi/4932caff0ff746eab6f01bf08b70ac45.png',
  } } }));
  vi.stubGlobal('fetch', (url: string, init: RequestInit) => new URL(url).pathname.endsWith('/nav') ? navMock(url, init) : fetchMock(url, init));
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('keyword video search API', () => {
  it('encodes keywords and page, and normalizes highlighted results without resolving video details', async () => {
    fetchMock.mockResolvedValue(response({ code: 0, data: { result: [video, video, { type: 'video', bvid: 'invalid' }], numResults: 50, numPages: 3 } }));
    const result = await searchBilibiliVideos(' 晴天 & 周杰伦 ', 2);
    const [url, init] = fetchMock.mock.calls[0];
    expect(new URL(url).searchParams.get('keyword')).toBe('晴天 & 周杰伦');
    expect(new URL(url).searchParams.get('page')).toBe('2');
    expect(init.credentials).toBe('include');
    expect(new URL(url).pathname).toBe('/x/web-interface/wbi/search/type');
    expect(new URL(url).searchParams.get('w_rid')).toMatch(/^[0-9a-f]{32}$/);
    expect(navMock.mock.calls[0][1].credentials).toBe('omit');
    expect(result).toMatchObject({ page: 2, totalPages: 3, totalResults: 50, videos: [{ bvid: video.bvid, title: '晴天 & Live', author: 'UP主', cover: 'https://i0.hdslb.com/cover.jpg' }] });
    expect(result.videos).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('accepts an empty result response', async () => {
    fetchMock.mockResolvedValue(response({ code: 0, data: { numResults: 0, numPages: 0 } }));
    expect(await searchBilibiliVideos('没有这首歌')).toEqual({ videos: [], page: 1, totalPages: 1, totalResults: 0 });
  });

  it.each([403, 412, 429])('turns HTTP %s into a verification hint without retrying or logging in', async (status) => {
    fetchMock.mockResolvedValue(response({}, status));
    await expect(searchBilibiliVideos('晴天')).rejects.toThrow('验证');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([-101, -352, -412])('handles Bilibili error code %s', async (code) => {
    fetchMock.mockResolvedValue(response({ code }));
    await expect(searchBilibiliVideos('晴天')).rejects.toThrow('验证');
  });


  it('recognizes a code=0 verification voucher instead of showing a false empty result', async () => {
    fetchMock.mockResolvedValue(response({ code: 0, data: { v_voucher: 'verification-required' } }));
    await expect(searchBilibiliVideos('晴天')).rejects.toThrow('验证');
  });

  it('handles HTML challenge pages and malformed results', async () => {
    fetchMock.mockResolvedValueOnce(response({}, 200, 'text/html'));
    await expect(searchBilibiliVideos('晴天')).rejects.toThrow('验证');
    fetchMock.mockResolvedValueOnce(response({ code: 0, data: { result: {} } }));
    await expect(searchBilibiliVideos('晴天')).rejects.toThrow('格式');
  });

  it('propagates cancellation while loading the public signing keys', async () => {
    const controller = new AbortController();
    navMock.mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));
    const request = searchBilibiliVideos('晴天', 1, controller.signal);
    const rejection = expect(request).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    await rejection;
    expect(navMock.mock.calls[0][1].signal.aborted).toBe(true);
  });

  it('times out without leaving a pending request', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));
    const request = searchBilibiliVideos('晴天');
    const rejection = expect(request).rejects.toThrow('超时');
    await vi.advanceTimersByTimeAsync(15000);
    await rejection;
  });

  it('keeps decoded markup as plain text and handles numeric entities', () => {
    expect(cleanSearchTitle('<em>晴天</em> &#x266a; &#39; &lt;img src=x&gt;')).toBe("晴天 ♪ ' <img src=x>");
    expect(cleanSearchTitle('&#99999999;')).toBe('\ufffd');
  });
});
