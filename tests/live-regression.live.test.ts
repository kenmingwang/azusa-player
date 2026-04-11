import { describe, it, expect } from 'vitest';
import { getSongList, getFavList } from '../src/background/DataProcess';
import { LIVE_REGRESSION_SNAPSHOT } from './fixtures/live-regression-snapshot';

describe('Live data regression snapshot (BVID/FID)', () => {
  it('matches baseline for fixed BVID', async () => {
    const songs = await getSongList(LIVE_REGRESSION_SNAPSHOT.bvid.id);

    expect(songs).toHaveLength(1);
    expect(songs[0].id).toBe(LIVE_REGRESSION_SNAPSHOT.bvid.cid);
    expect(songs[0].name).toBe(LIVE_REGRESSION_SNAPSHOT.bvid.title);
    expect(songs[0].singer).toBe(LIVE_REGRESSION_SNAPSHOT.bvid.ownerName);
    expect(String(songs[0].singerId)).toBe(String(LIVE_REGRESSION_SNAPSHOT.bvid.ownerMid));
  }, 120_000);

  it('matches baseline aggregate for fixed FID', async () => {
    const songs = await getFavList(LIVE_REGRESSION_SNAPSHOT.favorite.id);
    const names = new Set(songs.map((s: any) => s.name));
    const bvids = new Set(songs.map((s: any) => s.bvid));

    expect(songs.length).toBe(LIVE_REGRESSION_SNAPSHOT.favorite.expandedSongCount);

    for (const expectedBvid of LIVE_REGRESSION_SNAPSHOT.favorite.firstPageBvids) {
      expect(bvids.has(expectedBvid)).toBe(true);
    }

    for (const sample of LIVE_REGRESSION_SNAPSHOT.favorite.sampleSongs) {
      expect(names.has(sample.name)).toBe(true);
    }
  }, 180_000);
});
