import { describe, expect, it } from 'vitest';
import { parseSearchSource } from '../src/utils/searchSource';

describe('search source parsing', () => {
  it('parses bilibili video pages by BVID', () => {
    expect(parseSearchSource('https://www.bilibili.com/video/BV1BQ4y1X714')).toEqual({
      type: 'bvid',
      bvid: 'BV1BQ4y1X714',
    });
  });

  it('parses favorite, series, and collection sources from supported URLs', () => {
    expect(parseSearchSource('https://space.bilibili.com/123456/favlist?fid=1042352181')).toEqual({
      type: 'fav',
      mid: '1042352181',
    });

    expect(parseSearchSource('https://space.bilibili.com/444180997/lists/828030?type=series')).toEqual({
      type: 'series',
      mid: '444180997',
      sid: '828030',
    });

    expect(parseSearchSource('https://space.bilibili.com/5109111/lists/6995126?type=season')).toEqual({
      type: 'collection',
      mid: '5109111',
      sid: '6995126',
    });
  });

  it('parses channel detail pages for series and collection sources', () => {
    expect(parseSearchSource('https://space.bilibili.com/444180997/channel/seriesdetail?sid=828030')).toEqual({
      type: 'series',
      mid: '444180997',
      sid: '828030',
    });

    expect(parseSearchSource('https://space.bilibili.com/5109111/channel/collectiondetail?sid=6995126')).toEqual({
      type: 'collection',
      mid: '5109111',
      sid: '6995126',
    });
  });
});
