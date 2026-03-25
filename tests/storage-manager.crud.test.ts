import { describe, it, expect, beforeEach, vi } from 'vitest';
import StorageManager from '../src/objects/Storage';
import { createChromeMock } from './helpers/chrome-mock';

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('StorageManager CRUD regression', () => {
  beforeEach(() => {
    const { chromeMock } = createChromeMock();
    (globalThis as any).chrome = chromeMock;

    const manager = StorageManager.getInstance() as any;
    manager.latestFavLists = [];
    manager.setFavLists = vi.fn();
  });

  it('supports playlist add/update/delete lifecycle', async () => {
    const manager = StorageManager.getInstance();

    const created = manager.addFavList('E2E Test List');
    await tick();

    expect(created.info.id).toContain('FavList-');

    const localCreated = await manager.readLocalStorage(created.info.id);
    expect(localCreated.info.title).toBe('E2E Test List');

    const updated = {
      info: { ...created.info, title: 'E2E Updated List' },
      songList: [
        {
          id: '36507159061',
          bvid: 'BV1yNPbzjEVq',
          name: 'song-1',
          singer: 'test-up',
          singerId: '1',
          cover: 'cover',
        } as any,
      ],
    };

    manager.updateFavList(updated as any);
    await tick();

    const afterUpdate = await manager.readLocalStorage(created.info.id);
    expect(afterUpdate.info.title).toBe('E2E Updated List');
    expect(afterUpdate.songList).toHaveLength(1);
    expect(afterUpdate.songList[0].id).toBe('36507159061');

    manager.deleteFavList(created.info.id, [] as any);
    await tick();

    const afterDelete = await manager.readLocalStorage(created.info.id);
    expect(afterDelete).toBeUndefined();
  });

  it('supports lyric detail CRUD', async () => {
    const manager = StorageManager.getInstance();

    await manager.setLyricDetail('36507159061', { songMid: 'mid-1' });
    await manager.setLyricOffset('36507159061', 233);

    const detail = await manager.getLyricDetail('36507159061');
    expect(detail).toBeDefined();
    expect(detail?.lrcOffset).toBe(233);
    expect(detail?.lrc).toEqual({ songMid: 'mid-1' });
  });
});
