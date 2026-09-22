/**
 * Multi-source lyric lookup.
 *
 * Two public, key-free sources are used:
 *  - QQ 音乐 (`c.y.qq.com` smartbox + `u.y.qq.com` musicu search, lyrics from `i.y.qq.com`), which is what
 *    this project already used. It is accurate for latin titles but returns nothing for mixed
 *    中文+英文 queries and its musicu endpoint intermittently answers `code: 2001` (empty).
 *  - 网易云音乐 (`music.163.com/api`), which answers the CJK / mixed queries QQ drops and also reports
 *    the track duration, giving the matcher one more signal.
 *
 * `pickBestLyricCandidate` chooses the version whose title/artist best matches the song name, so the
 * default pick no longer depends on whatever happened to come back first.
 */

import { tryFixMojibake } from './Data';

export type LyricSource = 'qq' | 'netease';

export interface LyricCandidate {
  /** Stable identifier: `<source>:<id>`. */
  key: string;
  source: LyricSource;
  /** QQ `songmid` or 网易云 song id. */
  id: string;
  name: string;
  artist: string;
  /** Track length in seconds, when the source reports it. */
  duration?: number;
  /** Ready-to-render option label. */
  label: string;
}

export interface LyricQuery {
  name: string;
  artist?: string;
  /** Track length in seconds, when known. */
  duration?: number;
}

const SOURCE_LABELS: Record<LyricSource, string> = {
  qq: 'QQ音乐',
  netease: '网易云',
};

const ENDPOINTS = {
  qqSmartbox: 'https://c.y.qq.com/splcloud/fcgi-bin/smartbox_new.fcg?key={KeyWord}',
  qqSearch: 'https://u.y.qq.com/cgi-bin/musicu.fcg',
  qqLyric: 'https://i.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?songmid={SongMid}&g_tk=5381&format=json&inCharset=utf8&outCharset=utf-8&nobase64=1',
  neteaseSearch: 'https://music.163.com/api/search/get?s={KeyWord}&type=1&limit=10',
  neteaseLyric: 'https://music.163.com/api/song/lyric?id={SongId}&lv=1&kv=1&tv=-1',
};

const REQUEST_HEADERS: Record<string, string> = {
  Accept: 'application/json, text/plain, */*',
};

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

const defaultFetch: FetchLike = (url, init) => fetch(url, init);

const buildLabel = (candidate: Omit<LyricCandidate, 'label'>, index: number) =>
  `${index}. ${candidate.name}${candidate.artist ? ` / ${candidate.artist}` : ''} · ${SOURCE_LABELS[candidate.source]}`;

/** Human-readable description without the option-list index ("夜に駆ける / YOASOBI · QQ音乐"). */
export const describeLyricCandidate = (candidate: Pick<LyricCandidate, 'name' | 'artist' | 'source'>) =>
  `${candidate?.name || ''}${candidate?.artist ? ` / ${candidate.artist}` : ''} · ${
    SOURCE_LABELS[candidate?.source as LyricSource] || ''
  }`;

const cleanupText = (text = '') => String(text).replace(/\s+/g, ' ').trim();

const NOISE_TOKENS =
  /(翻唱|重唱|纯享|完整版|高音质|高清|无损音质|无损|中文字幕|中字|双语|字幕|歌词版|动态歌词|试听版|试听|片段|伴奏版|伴奏|纯音乐|合唱版|live版|现场版|cover|remix|ver\.?|version|official|mv|4k|1080p|60fps|hq|hd|feat\.?|ft\.?|prod\.?)+/gi;

/**
 * Folds a song title into something comparable: drops bracketed decorations (【】《》（）[]),
 * common noise tokens (翻唱 / 完整版 / 4K …), separator punctuation and case.
 */
export const normalizeLyricTitle = (raw: string): string => {
  let text = String(raw || '');
  text = text.replace(/[【\[（(][^】\]）)]*[】\]）)]/g, ' ');
  text = text.replace(/[《》「」『』]/g, ' ');
  // "feat./ft. X" carries the guest artist, not the title.
  text = text.replace(/\b(?:feat|ft)\.?\s+[^\s()（）【】[\],，、]+/gi, ' ');
  text = text.replace(NOISE_TOKENS, ' ');
  text = text.replace(/[-_|·・~～"'“”‘’`!！?？,，.。、:：;；/\\]+/g, ' ');
  text = text.replace(/\s+/g, ' ').trim().toLowerCase();
  return text;
};

/** Latin words (≥2 chars) plus CJK bigrams, so mixed titles still overlap usefully. */
const tokenize = (text: string): string[] => {
  const tokens = new Set<string>();
  text
    .split(/\s+/)
    .filter(Boolean)
    .forEach((chunk) => {
      if (/^[a-z0-9]+$/.test(chunk)) {
        if (chunk.length >= 2) tokens.add(chunk);
        return;
      }
      const cjk = chunk.replace(/[^\u3400-\u9fff\u3040-\u30ff]/g, '');
      if (cjk.length === 1) tokens.add(cjk);
      for (let i = 0; i < cjk.length - 1; i += 1) {
        tokens.add(cjk.slice(i, i + 2));
      }
      if (cjk.length > 1) tokens.add(cjk);
    });
  return [...tokens];
};

const overlapRatio = (target: string, candidate: string): number => {
  const targetTokens = tokenize(target);
  if (!targetTokens.length) return 0;
  const candidateTokens = new Set(tokenize(candidate));
  const hits = targetTokens.filter((token) => candidateTokens.has(token)).length;
  return hits / targetTokens.length;
};

/** Higher is better. 0 means "no signal" — callers then fall back to the source order. */
export const scoreLyricCandidate = (candidate: LyricCandidate, query: LyricQuery): number => {
  const targetTitle = normalizeLyricTitle(query?.name || '');
  const candidateTitle = normalizeLyricTitle(candidate?.name || '');
  if (!targetTitle || !candidateTitle) return 0;

  let score = 0;
  if (candidateTitle === targetTitle) {
    score += 100;
  } else if (candidateTitle.includes(targetTitle) || targetTitle.includes(candidateTitle)) {
    score += 60;
  } else {
    score += Math.round(40 * overlapRatio(targetTitle, candidateTitle));
  }

  const targetArtist = normalizeLyricTitle(query?.artist || '');
  const candidateArtist = normalizeLyricTitle(candidate?.artist || '');
  if (targetArtist && candidateArtist) {
    if (candidateArtist === targetArtist) score += 25;
    else if (candidateArtist.includes(targetArtist) || targetArtist.includes(candidateArtist)) score += 18;
    else score += Math.round(18 * overlapRatio(targetArtist, candidateArtist));
  }

  if (candidate.duration && query?.duration) {
    const diff = Math.abs(candidate.duration - query.duration);
    if (diff <= 2) score += 15;
    else if (diff <= 5) score += 10;
    else if (diff <= 10) score += 4;
  }

  // Slight preference for the source that also carries translations.
  score += candidate.source === 'qq' ? 2 : 1;
  return score;
};

export const pickBestLyricCandidate = (
  candidates: LyricCandidate[],
  query: LyricQuery,
): LyricCandidate | undefined => {
  if (!candidates?.length) return undefined;

  let best = candidates[0];
  let bestScore = scoreLyricCandidate(best, query);
  for (let index = 1; index < candidates.length; index += 1) {
    const score = scoreLyricCandidate(candidates[index], query);
    if (score > bestScore) {
      best = candidates[index];
      bestScore = score;
    }
  }
  return best;
};

const dedupeCandidates = (candidates: LyricCandidate[]): LyricCandidate[] => {
  const seen = new Set<string>();
  const result: LyricCandidate[] = [];
  candidates.forEach((candidate) => {
    const identity = `${candidate.source}:${candidate.id}`;
    const fingerprint = `${normalizeLyricTitle(candidate.name)}|${normalizeLyricTitle(candidate.artist)}`;
    if (seen.has(identity) || seen.has(fingerprint)) return;
    seen.add(identity);
    seen.add(fingerprint);
    result.push(candidate);
  });
  return result;
};

const withLabels = (candidates: Omit<LyricCandidate, 'label'>[]): LyricCandidate[] =>
  candidates.map((candidate, index) => ({ ...candidate, label: buildLabel(candidate, index) }));

const readJson = async (fetcher: FetchLike, url: string, init?: RequestInit) => {
  const response = await fetcher(url, {
    ...init,
    headers: { ...REQUEST_HEADERS, ...((init?.headers as Record<string, string>) || {}) },
  });
  if (!response.ok) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const searchQqSmartbox = async (keyword: string, fetcher: FetchLike = defaultFetch) => {
  const json = await readJson(fetcher, ENDPOINTS.qqSmartbox.replace('{KeyWord}', encodeURIComponent(keyword)));
  const list = json?.data?.song?.itemlist || [];
  return withLabels(
    list.map((song: any) => ({
      key: `qq:${song.mid}`,
      source: 'qq' as const,
      id: String(song.mid),
      name: cleanupText(song.name),
      artist: cleanupText(song.singer),
    })),
  );
};

export const searchQqMusicu = async (keyword: string, fetcher: FetchLike = defaultFetch) => {
  const body = {
    comm: { ct: '19', cv: '1859', uin: '0' },
    req: {
      method: 'DoSearchForQQMusicDesktop',
      module: 'music.search.SearchCgiService',
      param: { grp: 1, num_per_page: 20, page_num: 1, query: keyword, search_type: 0 },
    },
  };

  const json = await readJson(fetcher, ENDPOINTS.qqSearch, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const list = json?.req?.data?.body?.song?.list || [];
  return withLabels(
    list.map((song: any) => ({
      key: `qq:${song.mid}`,
      source: 'qq' as const,
      id: String(song.mid),
      name: cleanupText(song.name),
      artist: cleanupText((song.singer || []).map((singer: any) => singer?.name).filter(Boolean).join(',')),
      duration: Number(song.interval) > 0 ? Number(song.interval) : undefined,
    })),
  );
};

export const searchNetease = async (keyword: string, fetcher: FetchLike = defaultFetch) => {
  const json = await readJson(fetcher, ENDPOINTS.neteaseSearch.replace('{KeyWord}', encodeURIComponent(keyword)));
  const list = json?.result?.songs || [];
  return withLabels(
    list.map((song: any) => ({
      key: `netease:${song.id}`,
      source: 'netease' as const,
      id: String(song.id),
      name: cleanupText(song.name),
      artist: cleanupText((song.artists || []).map((artist: any) => artist?.name).filter(Boolean).join(',')),
      duration: Number(song.duration) > 0 ? Math.round(Number(song.duration) / 1000) : undefined,
    })),
  );
};

/** Queries every source in parallel; a failing source never blocks the others. */
export const searchLyricCandidates = async (
  keyword: string,
  fetcher: FetchLike = defaultFetch,
): Promise<LyricCandidate[]> => {
  const trimmed = String(keyword || '').trim();
  if (!trimmed) return [];

  const settled = await Promise.allSettled([
    searchQqSmartbox(trimmed, fetcher),
    searchQqMusicu(trimmed, fetcher),
    searchNetease(trimmed, fetcher),
  ]);

  const merged = settled.flatMap((result) => (result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : []));
  return dedupeCandidates(merged).map((candidate, index) => ({
    ...candidate,
    label: buildLabel(candidate, index),
  }));
};

const mergeTranslation = (lyric: string, translation?: string) => {
  const main = String(lyric || '');
  if (!translation) return main;
  return `${translation}\n${main}`;
};

const LRC_METADATA_TAG = /^\[(ti|ar|al|by|re|ve|offset|length|kana|au):[^\]]*\]$/i;

const CREDIT_TOKENS = new Set([
  '作词',
  '作曲',
  '编曲',
  '词曲',
  '制作人',
  '制作',
  '监制',
  '总监',
  '音乐总监',
  '艺人统筹',
  '宣传总监',
  '策划统筹',
  '统筹',
  '策划',
  '录音',
  '录音师',
  '录音棚',
  '混音',
  '母带',
  '后期',
  '吉他',
  '贝斯',
  '鼓',
  '鼓手',
  '键盘',
  '和声',
  '配唱',
  '弦乐',
  '发行',
  '出品',
  '营销',
  '营销推广',
  '推广',
  '文案',
  '设计',
  '版权',
  '词',
  '曲',
  'op',
  'sp',
]);

const CREDIT_SUBSTRINGS = Array.from(CREDIT_TOKENS).filter((token) => token.length >= 2 && token !== 'op' && token !== 'sp');

/** "制作统筹" is not in the list verbatim but contains "制作" and "统筹" — treat it as a credit head. */
const isCreditToken = (token: string): boolean => {
  const lower = token.toLowerCase();
  return CREDIT_TOKENS.has(lower) || CREDIT_SUBSTRINGS.some((word) => lower.includes(word));
};

/**
 * "出品/发行：华声时代" and "录音棚：缪思音乐Studio" are credit lines the 版权方 puts in the LRC
 * with real timestamps, so a player scrolls them as if they were lyrics. Lyrics that merely contain
 * a keyword without a colon ("出品方就是我自己") or use a non-credit head ("这么多年：我还是一个人")
 * are kept.
 */
export const isLrcCreditLine = (content: string): boolean => {
  const separator = content.search(/[:：]/);
  if (separator <= 0 || separator > 16) return false;
  const tokens = content
    .slice(0, separator)
    .split(/[/、&＋+·|｜,，\s]+/)
    .filter(Boolean);
  return tokens.length > 0 && tokens.length <= 4 && tokens.every(isCreditToken);
};

/**
 * Drops `[ti:]/[ar:]` metadata and the credit block ("制作人：…") at the head of the LRC.
 */
export const stripLrcCredits = (lrc: string): string =>
  String(lrc || '')
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      if (LRC_METADATA_TAG.test(trimmed)) return false;
      const content = trimmed.replace(/^(\[\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?\])+/, '').trim();
      if (!content) return false;
      return !isLrcCreditLine(content);
    })
    .join('\n');

export const fetchLyricText = async (
  candidate: LyricCandidate,
  fetcher: FetchLike = defaultFetch,
): Promise<string> => {
  if (candidate?.source === 'netease') {
    const json = await readJson(fetcher, ENDPOINTS.neteaseLyric.replace('{SongId}', encodeURIComponent(candidate.id)));
    const lyric = json?.lrc?.lyric || '';
    const translation = json?.tlyric?.lyric || '';
    return stripLrcCredits(tryFixMojibake(mergeTranslation(lyric, translation)));
  }

  const json = await readJson(fetcher, ENDPOINTS.qqLyric.replace('{SongMid}', encodeURIComponent(candidate.id)));
  const lyric = json?.lyric || '';
  const translation = json?.trans || '';
  return stripLrcCredits(tryFixMojibake(mergeTranslation(lyric, translation)));
};
