import { buildRequestUrl } from './Data';
import { signWbiQuery } from './wbi';

export interface VideoSearchItem {
  bvid: string;
  title: string;
  author: string;
  cover: string;
  duration: string;
  playCount: number;
}

export interface VideoSearchPage {
  videos: VideoSearchItem[];
  page: number;
  totalPages: number;
  totalResults: number;
}

const SEARCH_ENDPOINT = 'https://api.bilibili.com/x/web-interface/wbi/search/type';
const NAV_ENDPOINT = 'https://api.bilibili.com/x/web-interface/nav';
const VERIFICATION_MESSAGE = 'B 站暂时限制了搜索请求。请在 B 站网页确认能正常搜索并完成页面要求的验证，再回来重试。';

// Search titles contain <em> highlights. Render plain text, never server-provided HTML.
export const cleanSearchTitle = (value: unknown): string => {
  const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return String(value ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (entity, key: string) => {
      if (!key.startsWith('#')) return entities[key.toLowerCase()] ?? entity;
      const code = key.toLowerCase().startsWith('#x') ? parseInt(key.slice(2), 16) : Number(key.slice(1));
      return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)
        ? String.fromCodePoint(code)
        : '\ufffd';
    });
};

const normalizeCover = (value: unknown): string => {
  const source = String(value ?? '');
  try {
    const url = new URL(source.startsWith('//') ? `https:${source}` : source);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
};

export async function searchBilibiliVideos(keyword: string, page = 1, signal?: AbortSignal): Promise<VideoSearchPage> {
  const query = keyword.trim();
  if (!query) throw new Error('请输入歌名、歌手或关键词。');
  const requestedPage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) controller.abort();
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 15000);

  try {
    // /nav supplies public WBI keys even when code is -101 (visitor, not logged in).
    const navResponse = await fetch(buildRequestUrl(NAV_ENDPOINT), {
      credentials: 'omit',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if ([403, 412, 429].includes(navResponse.status)) throw new Error(VERIFICATION_MESSAGE);
    if (!navResponse.ok) throw new Error(`搜索初始化失败（HTTP ${navResponse.status}），请稍后重试。`);
    if (!(navResponse.headers.get('content-type') || '').includes('application/json')) throw new Error(VERIFICATION_MESSAGE);
    const nav = await navResponse.json();
    const images = nav?.data?.wbi_img;
    if (!images?.img_url || !images?.sub_url) throw new Error('无法获取 B 站搜索签名信息，请稍后重试。');
    const signedQuery = signWbiQuery({
      search_type: 'video', keyword: query, page: String(requestedPage), order: 'totalrank', web_location: '1430654',
    }, images.img_url, images.sub_url);
    const response = await fetch(buildRequestUrl(`${SEARCH_ENDPOINT}?${signedQuery}`), {
      credentials: 'include',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if ([403, 412, 429].includes(response.status)) throw new Error(VERIFICATION_MESSAGE);
    if (!response.ok) throw new Error(`搜索请求失败（HTTP ${response.status}），请稍后重试。`);
    if (!(response.headers.get('content-type') || '').includes('application/json')) throw new Error(VERIFICATION_MESSAGE);
    const json = await response.json();
    if (json.code !== 0) {
      if ([-101, -352, -412, -509, -799].includes(json.code)) throw new Error(VERIFICATION_MESSAGE);
      throw new Error(`B 站搜索失败：${String(json.message || json.msg || json.code)}`);
    }
    const data = json.data;
    // Bilibili can return code=0 with only a verification voucher and no results.
    if (data?.v_voucher || data?.gaia_res_type) throw new Error(VERIFICATION_MESSAGE);
    if (!data || (data.result != null && !Array.isArray(data.result))) {
      throw new Error('搜索结果格式发生变化，请稍后重试。');
    }
    const seen = new Set<string>();
    const videos: VideoSearchItem[] = [];
    for (const item of data.result || []) {
      const bvid = String(item?.bvid || '');
      if (!/^BV[0-9a-zA-Z]{10}$/.test(bvid) || seen.has(bvid) || (item.type && item.type !== 'video')) continue;
      seen.add(bvid);
      videos.push({
        bvid,
        title: cleanSearchTitle(item.title),
        author: cleanSearchTitle(item.author),
        cover: normalizeCover(item.pic),
        duration: String(item.duration || ''),
        playCount: Math.max(0, Number(item.play) || 0),
      });
    }
    const totalResults = Math.max(0, Number(data.numResults) || 0);
    const totalPages = Math.max(1, Math.ceil(Number(data.numPages) || totalResults / (Number(data.pagesize) || 20)));
    return { videos, page: requestedPage, totalPages, totalResults };
  } catch (error) {
    if (timedOut && !signal?.aborted) throw new Error('搜索超时，请稍后重试。');
    if (error instanceof TypeError) throw new Error('无法连接 B 站搜索服务，请检查网络后重试。');
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}
