import { describe, it, expect, vi } from 'vitest';
import {
  fetchLyricText,
  normalizeLyricTitle,
  pickBestLyricCandidate,
  scoreLyricCandidate,
  searchLyricCandidates,
  searchQqMusicu,
  searchQqSmartbox,
  searchNetease,
  stripLrcCredits,
  type LyricCandidate,
} from '../src/utils/lyricApi';

const candidate = (over: Partial<LyricCandidate>): LyricCandidate => ({
  key: 'qq:x',
  source: 'qq',
  id: 'x',
  name: '',
  artist: '',
  label: '',
  ...over,
});

const jsonResponse = (body: unknown, ok = true) =>
  Promise.resolve({
    ok,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response);

describe('lyric title normalization', () => {
  it('drops uploader brackets and cover decorations', () => {
    expect(normalizeLyricTitle('【阿梓】Brave Shine【翻唱】')).toBe('brave shine');
    expect(normalizeLyricTitle('Departures (完整版)')).toBe('departures');
  });

  it('strips parentheticals, noise words and separators', () => {
    expect(normalizeLyricTitle('打上花火 - 高音质 4K')).toBe('打上花火');
    expect(normalizeLyricTitle('《起风了》中文字幕')).toBe('起风了');
    expect(normalizeLyricTitle('Brave Shine feat. Aimer')).toBe('brave shine');
  });

  it('tolerates empty input', () => {
    expect(normalizeLyricTitle('')).toBe('');
    expect(normalizeLyricTitle(undefined as unknown as string)).toBe('');
  });
});

describe('lyric candidate scoring', () => {
  it('prefers an exact title match over a partial one', () => {
    const exact = candidate({ name: 'Brave Shine', artist: 'Aimer' });
    const partial = candidate({ name: 'Brave Shine English Ver', artist: 'Aimer' });
    const query = { name: 'Brave Shine', artist: 'Aimer' };

    expect(scoreLyricCandidate(exact, query)).toBeGreaterThan(scoreLyricCandidate(partial, query));
  });

  it('prefers the matching artist among identical titles', () => {
    const right = candidate({ name: '打上花火', artist: 'Daoko,米津玄師' });
    const cover = candidate({ name: '打上花火', artist: '某翻唱歌手' });
    const query = { name: '打上花火', artist: '米津玄師' };

    expect(scoreLyricCandidate(right, query)).toBeGreaterThan(scoreLyricCandidate(cover, query));
  });

  it('uses track duration as a tie-breaker', () => {
    const near = candidate({ name: '起风了', artist: '周深', duration: 312 });
    const far = candidate({ name: '起风了', artist: '周深', duration: 180 });
    const query = { name: '起风了', artist: '周深', duration: 311 };

    expect(scoreLyricCandidate(near, query)).toBeGreaterThan(scoreLyricCandidate(far, query));
  });

  it('scores unrelated candidates below a real match', () => {
    const match = candidate({ name: 'Departures', artist: 'EGOIST' });
    const unrelated = candidate({ name: '呼吸决定', artist: '阿梓' });
    const query = { name: 'Departures', artist: '阿梓' };

    expect(scoreLyricCandidate(unrelated, query)).toBeLessThan(scoreLyricCandidate(match, query));
  });
});

describe('pickBestLyricCandidate', () => {
  it('picks the version whose name matches the song name', () => {
    const options = [
      candidate({ name: 'Brave Shine (Fate/Stay Night)', artist: 'Sapphire', key: 'qq:3' }),
      candidate({ name: 'Brave Shine', artist: 'Aimer', key: 'qq:1' }),
      candidate({ name: 'Bressanone 布列瑟农（循环雅乐）', artist: '将记忆永存', key: 'qq:5' }),
    ];

    expect(pickBestLyricCandidate(options, { name: 'Brave Shine', artist: 'Aimer' })?.key).toBe('qq:1');
  });

  it('falls back to the first candidate when nothing scores', () => {
    const options = [candidate({ name: 'Alpha', key: 'qq:a' }), candidate({ name: 'Beta', key: 'qq:b' })];
    expect(pickBestLyricCandidate(options, { name: 'ZZZ' })?.key).toBe('qq:a');
  });

  it('returns undefined for an empty list', () => {
    expect(pickBestLyricCandidate([], { name: 'x' })).toBeUndefined();
  });
});

describe('multi-source candidate search', () => {
  const fetcher = vi.fn(async (url: string) => {
    if (url.includes('smartbox')) {
      return jsonResponse({ data: { song: { itemlist: [{ mid: 'qq-1', name: 'Brave Shine', singer: 'Aimer' }] } } });
    }
    if (url.includes('musicu')) {
      return jsonResponse({
        req: {
          data: {
            body: {
              song: {
                list: [
                  { mid: 'qq-1', name: 'Brave Shine', singer: [{ name: 'Aimer' }], interval: 233 },
                  { mid: 'qq-2', name: 'Brave Shine', singer: [{ name: '祈Inory' }], interval: 231 },
                ],
              },
            },
          },
        },
      });
    }
    if (url.includes('music.163.com/api/search')) {
      return jsonResponse({
        result: { songs: [{ id: 42, name: 'Brave Shine', artists: [{ name: 'Aimer' }], duration: 233000 }] },
      });
    }
    return jsonResponse({}, false);
  }) as any;

  it('parses each source into normalized candidates', async () => {
    const [qqSmart, qqPost, netease] = await Promise.all([
      searchQqSmartbox('Brave Shine', fetcher),
      searchQqMusicu('Brave Shine', fetcher),
      searchNetease('Brave Shine', fetcher),
    ]);

    expect(qqSmart[0]).toMatchObject({ source: 'qq', id: 'qq-1', name: 'Brave Shine', artist: 'Aimer' });
    expect(qqPost[0]).toMatchObject({ source: 'qq', id: 'qq-1', duration: 233 });
    expect(netease[0]).toMatchObject({ source: 'netease', id: '42', duration: 233 });
  });

  it('merges sources, dedupes identical tracks and keeps labels readable', async () => {
    const results = await searchLyricCandidates('Brave Shine', fetcher);

    // The 网易云 hit is the same title+artist as the QQ one, so it collapses into the first entry.
    expect(results.map((item) => item.key)).toEqual(['qq:qq-1', 'qq:qq-2']);
    expect(results[0].label).toBe('0. Brave Shine / Aimer · QQ音乐');
    expect(results[1].label).toBe('1. Brave Shine / 祈Inory · QQ音乐');
  });

  it('keeps a 网易云 entry that QQ does not know about', async () => {
    const mixedFetcher = vi.fn(async (url: string) => {
      if (url.includes('smartbox')) return jsonResponse({ data: { song: { itemlist: [{ mid: 'qq-9', name: 'Brave Shine', singer: 'Aimer' }] } } });
      if (url.includes('musicu')) return jsonResponse({ req: { data: { body: { song: { list: [] } } } } });
      return jsonResponse({ result: { songs: [{ id: 55, name: 'Brave Shine (Cover)', artists: [{ name: '祈Inory' }], duration: 233000 }] } });
    }) as any;

    const results = await searchLyricCandidates('Brave Shine', mixedFetcher);

    expect(results.map((item) => item.key)).toEqual(['qq:qq-9', 'netease:55']);
    expect(results[1].label).toBe('1. Brave Shine (Cover) / 祈Inory · 网易云');
  });

  it('returns nothing for an empty keyword without touching the network', async () => {
    const spy = vi.fn();
    expect(await searchLyricCandidates('   ', spy as any)).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });

  it('survives a source failing outright', async () => {
    const flaky = vi.fn(async (url: string) => {
      if (url.includes('smartbox')) throw new Error('offline');
      if (url.includes('musicu')) return jsonResponse({ req: { code: 2001, data: { body: { song: { list: [] } } } } });
      return jsonResponse({ result: { songs: [{ id: 7, name: '起风了', artists: [{ name: '周深' }], duration: 311000 }] } });
    }) as any;

    const results = await searchLyricCandidates('起风了', flaky);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ source: 'netease', id: '7' });
  });

  it('picks a CJK title from the fallback source when QQ answers empty', async () => {
    const cjkFetcher = vi.fn(async (url: string) => {
      if (url.includes('smartbox')) return jsonResponse({ data: { song: { itemlist: [] } } });
      if (url.includes('musicu')) return jsonResponse({ req: { code: 2001, data: { body: { song: { list: [] } } } } });
      return jsonResponse({
        result: {
          songs: [
            { id: 1, name: '起风了', artists: [{ name: '8Y1ar' }], duration: 285000 },
            { id: 2, name: '起风了', artists: [{ name: '周深' }], duration: 311000 },
          ],
        },
      });
    }) as any;

    const results = await searchLyricCandidates('起风了', cjkFetcher);

    expect(results).toHaveLength(2);
    // Same title twice: the artist decides, exactly like the live 起风了 case (周深 vs a re-upload).
    expect(pickBestLyricCandidate(results, { name: '起风了', artist: '周深' })?.id).toBe('2');
    // Without any artist hint the first (source order) wins.
    expect(pickBestLyricCandidate(results, { name: '起风了' })?.id).toBe('1');
  });
});

describe('lyric text fetching', () => {
  it('drops credit lines whose keywords are joined or unusual', () => {
    const lrc = [
      '[00:01.000]出品/发行：华声时代',
      '[00:02.000]录音棚：缪思音乐Studio',
      '[00:03.000]策划统筹：丸子',
      '[00:04.000]录音师：张三、李四',
      '[00:05.000]一个人画着青春',
      '[00:06.000]出品方就是我自己',
      '[00:07.000]这么多年：我还是一个人',
    ].join('\n');

    const kept = stripLrcCredits(lrc).split('\n');

    expect(kept.some((line) => line.includes('出品/发行'))).toBe(false);
    expect(kept.some((line) => line.includes('录音棚'))).toBe(false);
    expect(kept.some((line) => line.includes('策划统筹'))).toBe(false);
    expect(kept.some((line) => line.includes('录音师'))).toBe(false);
    // real lyrics survive, including ones that merely contain a credit keyword
    expect(kept.some((line) => line.includes('一个人画着青春'))).toBe(true);
    expect(kept.some((line) => line.includes('出品方就是我自己'))).toBe(true);
    expect(kept.some((line) => line.includes('这么多年：我还是一个人'))).toBe(true);
  });

  it('drops metadata tags and the credit block from a real QQ payload', () => {
    const lrc = [
      '[ti:一个人]',
      '[ar:王栎鑫]',
      '[00:00.000]制作统筹：李梦思',
      '[00:00.000]制作人：时金宇/刘向',
      '[00:00.000]音乐总监：时金宇',
      '[00:04.500]一个人 走在风中',
      '[00:09.000]一个人 看着天空',
    ].join('\n');

    const clean = stripLrcCredits(lrc);

    expect(clean).toBe('[00:04.500]一个人 走在风中\n[00:09.000]一个人 看着天空');
  });

  it('keeps lyric lines that merely mention a credit word', () => {
    const lrc = '[00:01.000]我写的歌 作曲的人不是你\n[00:05.000]吉他声响起';
    expect(stripLrcCredits(lrc)).toBe('[00:01.000]我写的歌 作曲的人不是你\n[00:05.000]吉他声响起');
  });

  it('handles multi-timestamp lines and empty input', () => {
    expect(stripLrcCredits('[00:01.000][00:09.000]副歌')).toBe('[00:01.000][00:09.000]副歌');
    expect(stripLrcCredits('')).toBe('');
  });

  it('prepends the QQ translation to the lyric', async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({ lyric: '[00:01.000]shining', trans: '[00:01.000]闪耀' }),
    ) as any;

    const lrc = await fetchLyricText(candidate({ source: 'qq', id: 'mid-1' }), fetcher);

    expect(lrc.startsWith('[00:01.000]闪耀')).toBe(true);
    expect(lrc).toContain('[00:01.000]shining');
  });

  it('reads the netease lyric payload', async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({ lrc: { lyric: '[00:02.000]风' }, tlyric: { lyric: '[00:02.000]wind' } }),
    ) as any;

    const lrc = await fetchLyricText(candidate({ source: 'netease', id: '9' }), fetcher);

    expect(lrc).toBe('[00:02.000]wind\n[00:02.000]风');
  });

  it('returns an empty string when the payload has no lyric', async () => {
    const fetcher = vi.fn(async () => jsonResponse({})) as any;
    expect(await fetchLyricText(candidate({ source: 'netease', id: '1' }), fetcher)).toBe('');
  });
});
