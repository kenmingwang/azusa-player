import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createChromeMock } from './helpers/chrome-mock';

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

const createFavRecord = (id: string, title: string, songList: any[] = []) => ({
  info: { id, title },
  songList,
});

describe('service worker context menus', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('adds the current page source through the element context menu and notifies popup listeners', async () => {
    const favId = 'FavList-1';
    const { chromeMock, localStore, emitRuntimeMessage, emitContextMenuShown, emitContextMenuClick } = createChromeMock({
      MyFavList: [favId],
      [favId]: createFavRecord(favId, 'My Playlist'),
    });
    (globalThis as any).chrome = chromeMock;
    chromeMock.scripting.executeScript.mockResolvedValue([
      {
        result: [
          { id: '36507159061', bvid: 'BV1BQ4y1X714', name: 'Song', singer: 'Singer', cover: 'cover' },
        ],
      },
    ]);

    await import('../src/serviceworker/index.ts');
    await flushPromises();

    emitRuntimeMessage(
      {
        type: 'context-target-change',
        data: {
          source: { type: 'bvid', bvid: 'BV1BQ4y1X714' },
          targetType: 'non-link-item',
        },
      },
      { tab: { id: 9 } },
    );
    emitContextMenuShown({}, { id: 9 });
    emitContextMenuClick({ menuItemId: `element::${favId}` }, { id: 9 });
    await flushPromises();

    expect(chromeMock.contextMenus.update).toHaveBeenCalledWith(
      'AddToPlayListElement',
      expect.objectContaining({ visible: true }),
      expect.any(Function),
    );
    expect(chromeMock.scripting.executeScript).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { tabId: 9 },
        args: [{ type: 'bvid', bvid: 'BV1BQ4y1X714' }],
      }),
    );
    expect(localStore[favId].songList).toHaveLength(1);
    expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'fav-update',
        data: expect.objectContaining({ favId, count: 1 }),
      }),
      expect.any(Function),
    );
    expect(chromeMock.notifications.create).toHaveBeenCalled();
  });

  it('parses supported page and link menu targets before adding them to playlists', async () => {
    const favId = 'FavList-2';
    const { chromeMock, emitContextMenuClick } = createChromeMock({
      MyFavList: [favId],
      [favId]: createFavRecord(favId, 'Source Playlist'),
    });
    (globalThis as any).chrome = chromeMock;
    chromeMock.scripting.executeScript.mockResolvedValue([
      {
        result: [],
      },
    ]);

    await import('../src/serviceworker/index.ts');
    await flushPromises();
    await flushPromises();

    emitContextMenuClick(
      {
        menuItemId: `page::${favId}`,
        pageUrl: 'https://www.bilibili.com/video/BV1BQ4y1X714',
      },
      { id: 10 },
    );
    await flushPromises();
    emitContextMenuClick(
      {
        menuItemId: `link::${favId}`,
        linkUrl: 'https://space.bilibili.com/123456/favlist?fid=1042352181',
      },
      { id: 10 },
    );
    await flushPromises();
    emitContextMenuClick(
      {
        menuItemId: `link::${favId}`,
        linkUrl: 'https://space.bilibili.com/5109111/lists/6995126?type=season',
      },
      { id: 10 },
    );
    await flushPromises();

    const executeCalls = chromeMock.scripting.executeScript.mock.calls.map(([payload]: [any]) => payload);

    expect(executeCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          target: { tabId: 10 },
          args: expect.arrayContaining([expect.objectContaining({ type: 'bvid', bvid: 'BV1BQ4y1X714' })]),
        }),
        expect.objectContaining({
          target: { tabId: 10 },
          args: expect.arrayContaining([expect.objectContaining({ type: 'fav', mid: '1042352181' })]),
        }),
        expect.objectContaining({
          target: { tabId: 10 },
          args: expect.arrayContaining([expect.objectContaining({ type: 'collection', mid: '5109111', sid: '6995126' })]),
        }),
      ]),
    );
  });
});
