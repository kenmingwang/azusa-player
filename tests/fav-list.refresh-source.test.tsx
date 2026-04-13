/** @vitest-environment jsdom */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FavList } from '../src/components/FavList';
import { createChromeMock } from './helpers/chrome-mock';

const { refreshSongsFromSource } = vi.hoisted(() => ({
  refreshSongsFromSource: vi.fn(),
}));

vi.mock('../src/background/DataProcess', async () => {
  const actual = await vi.importActual<typeof import('../src/background/DataProcess')>('../src/background/DataProcess');
  return {
    ...actual,
    refreshSongsFromSource,
  };
});

vi.mock('../src/popup/App', async () => {
  const ReactModule = await import('react');
  return {
    __esModule: true,
    default: ReactModule.createContext<any>(null),
    App: () => null,
  };
});

// eslint-disable-next-line import/first
import StorageManagerCtx from '../src/popup/App';

vi.mock('../src/components/Search', () => ({
  Search: () => <div data-testid='mock-search' />,
}));

vi.mock('../src/components/Fav', () => ({
  Fav: ({ FavList, onRefreshFromSource }: any) => (
    <div>
      <div data-testid='mock-fav' data-songcount={FavList.songList.length}>
        {FavList.info.title}
      </div>
      <button type='button' onClick={() => onRefreshFromSource?.(FavList)}>
        刷新来源
      </button>
    </div>
  ),
}));

vi.mock('../src/components/AddFavDialog', () => ({
  AddFavDialog: () => null,
  NewFavDialog: () => null,
  HelpDialog: () => null,
}));

describe('FavList refresh from source', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    refreshSongsFromSource.mockReset();
  });

  it('shows refresh failure notice and keeps the existing playlist when source refresh fails', async () => {
    const user = userEvent.setup();
    const { chromeMock } = createChromeMock();
    (globalThis as any).chrome = chromeMock;

    const initialFav = {
      info: {
        id: 'FavList-1',
        title: '旧歌单',
        currentTableInfo: {},
        source: { type: 'fav', mid: '1042352181' },
      },
      songList: [{ id: 's1', name: '旧歌', singer: 'A', singerId: '1', bvid: 'BV_OLD' }],
    };

    const fakeStorage = {
      latestFavLists: [initialFav],
      setFavLists: undefined as any,
      initFavLists: vi.fn().mockImplementation(function (this: any) {
        this.setFavLists?.([...this.latestFavLists]);
        return Promise.resolve();
      }),
      readLocalStorage: vi.fn(),
      getPlayerSetting: vi.fn().mockResolvedValue({ darkMode: false }),
      setPlayerSetting: vi.fn(),
      updateFavList: vi.fn(),
      exportStorage: vi.fn(),
      importStorage: vi.fn(),
      addFavList: vi.fn(),
      deleteFavList: vi.fn(),
    } as any;

    refreshSongsFromSource.mockRejectedValue(new Error('The request was rejected because of the bilibili security control policy.'));

    render(
      <StorageManagerCtx.Provider value={fakeStorage}>
        <FavList
          darkMode={false}
          onPlayOneFromFav={vi.fn()}
          onPlayAllFromFav={vi.fn()}
          onAddFavToList={vi.fn()}
          onAddOneFromFav={vi.fn()}
        />
      </StorageManagerCtx.Provider>,
    );

    expect(await screen.findByTestId('mock-fav')).toHaveTextContent('旧歌单');
    expect(screen.getByTestId('mock-fav')).toHaveAttribute('data-songcount', '1');

    await user.click(screen.getByRole('button', { name: '刷新来源' }));

    await waitFor(() => {
      expect(refreshSongsFromSource).toHaveBeenCalledWith(
        { type: 'fav', mid: '1042352181' },
        [{ id: 's1', name: '旧歌', singer: 'A', singerId: '1', bvid: 'BV_OLD' }],
        expect.any(Function),
      );
      expect(screen.getByText('按原始来源刷新失败，已保留当前歌单内容。请稍后重试，或先在 B 站页面完成验证后再刷新。')).toBeInTheDocument();
    });

    expect(fakeStorage.updateFavList).not.toHaveBeenCalled();
    expect(screen.getByTestId('mock-fav')).toHaveAttribute('data-songcount', '1');
  });

  it('shows progress and warning notice when some songs fail during source refresh', async () => {
    const user = userEvent.setup();
    const { chromeMock } = createChromeMock();
    (globalThis as any).chrome = chromeMock;

    const initialFav = {
      info: {
        id: 'FavList-1',
        title: '旧歌单',
        currentTableInfo: {},
        source: { type: 'fav', mid: '1042352181' },
      },
      songList: [{ id: 's1', name: '旧歌', singer: 'A', singerId: '1', bvid: 'BV_OLD' }],
    };

    const fakeStorage = {
      latestFavLists: [initialFav],
      setFavLists: undefined as any,
      initFavLists: vi.fn().mockImplementation(function (this: any) {
        this.setFavLists?.([...this.latestFavLists]);
        return Promise.resolve();
      }),
      readLocalStorage: vi.fn(),
      getPlayerSetting: vi.fn().mockResolvedValue({ darkMode: false }),
      setPlayerSetting: vi.fn(),
      updateFavList: vi.fn(),
      exportStorage: vi.fn(),
      importStorage: vi.fn(),
      addFavList: vi.fn(),
      deleteFavList: vi.fn(),
    } as any;

    refreshSongsFromSource.mockImplementation(
      async (_source: any, _songs: any, onProgress: (progress: any) => void) => {
        onProgress({ processed: 1, total: 3, failedCount: 0 });
        onProgress({ processed: 3, total: 3, failedCount: 1 });
        return {
          songs: [
            { id: 's1', name: '旧歌', singer: 'A', singerId: '1', bvid: 'BV_OLD' },
            { id: 's2', name: '新歌', singer: 'B', singerId: '2', bvid: 'BV_NEW' },
          ],
          processed: 3,
          total: 3,
          failedCount: 1,
          failedBvids: ['BV_FAIL'],
        };
      },
    );

    render(
      <StorageManagerCtx.Provider value={fakeStorage}>
        <FavList
          darkMode={false}
          onPlayOneFromFav={vi.fn()}
          onPlayAllFromFav={vi.fn()}
          onAddFavToList={vi.fn()}
          onAddOneFromFav={vi.fn()}
        />
      </StorageManagerCtx.Provider>,
    );

    expect(await screen.findByTestId('mock-fav')).toHaveTextContent('旧歌单');
    await user.click(screen.getByRole('button', { name: '刷新来源' }));

    await waitFor(() => {
      expect(screen.getByText('刷新来源完成 3/3，失败 1 首')).toBeInTheDocument();
      expect(screen.getByText('刷新完成，但有 1 首获取失败，已跳过。请稍后再试。')).toBeInTheDocument();
    });

    expect(fakeStorage.updateFavList).toHaveBeenCalledWith(
      expect.objectContaining({
        songList: expect.arrayContaining([expect.objectContaining({ id: 's2', bvid: 'BV_NEW' })]),
      }),
    );
  });
});
