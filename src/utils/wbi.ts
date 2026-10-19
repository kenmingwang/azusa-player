import { md5 } from '@noble/hashes/legacy';
import { bytesToHex } from '@noble/hashes/utils';

// The permutation and encoding follow Bilibili's public search web client.
// https://s1.hdslb.com/bfs/static/shanks/laputa-search/assets/index-9c8665e7.js
const MIXIN_ORDER = [46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52];

export function signWbiQuery(params: Record<string, string>, imgUrl: string, subUrl: string): string {
  const extractKey = (url: string) => new URL(url).pathname.split('/').pop()?.split('.')[0] || '';
  const key = extractKey(imgUrl) + extractKey(subUrl);
  if (!/^[0-9a-f]{64}$/i.test(key)) throw new Error('无法获取 B 站搜索签名信息，请稍后重试。');
  const mixin = MIXIN_ORDER.map((index) => key[index]).join('').slice(0, 32);
  const values: Record<string, string> = { ...params, wts: String(Math.round(Date.now() / 1000)) };
  const query = Object.keys(values).sort().map((name) =>
    `${encodeURIComponent(name)}=${encodeURIComponent(values[name].replace(/[!'()*]/g, ''))}`,
  ).join('&');
  return `${query}&w_rid=${bytesToHex(md5(query + mixin))}`;
}
