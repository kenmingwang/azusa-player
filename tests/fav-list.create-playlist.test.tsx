/** @vitest-environment jsdom */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FavList } from '../src/components/FavList';
import { createChromeMock } from './helpers/chrome-mock';

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

const SEARCH_RESULT = {
  songList: [
    { id: 'c1', bvid: 'BV_MULTI', name: 'part1', singer: 'up', singerId: 7, cover: 'cover' },
    { id: 'c2', bvid: 'BV_MULTI', name: 'part2', singer: 'up', singerId: 7, cover: 'cover' },
  ],
  info: { title: '搜索歌单 - BV_MULTI', id: 'FavList-Search', source: { type: 'bvid', bvid: 'BV_MULTI' } },
};

vi.mock('../src/components/Search', () => ({
  Search: ({ handleSeach }: any) => (
    <button type='button' data-testid='mock-search' onClick={() => handleSeach(SEARCH_RESULT)}>
      search
    </button>
  ),
}));

vi.mock('../src/components/Fav', () => ({
  Fav: ({ FavList }: any) => (
    <div data-testid='mock-fav' data-favid={FavList.info.id} data-songcount={FavList.songList.length} data-title={FavList.info.title} />
  ),
}));

const buildStorageManager = (initialFavLists: any[] = []) =>
  ({
    latestFavLists: initialFavLists,
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
    addFavList: vi.fn((title: string) => ({ info: { id: 'FavList-new-1', title }, songList: [] })),
    deleteFavList: vi.fn(),
  }) as any;

const renderFavList = (storageManager: any) =>
  render(
    <StorageManagerCtx.Provider value={storageManager}>
      <FavList
        darkMode={false}
        onPlayOneFromFav={vi.fn()}
        onPlayAllFromFav={vi.fn()}
        onAddFavToList={vi.fn()}
        onAddOneFromFav={vi.fn()}
      />
    </StorageManagerCtx.Provider>,
  );

describe('AddFavDialog create-and-add flow', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a brand new playlist straight from the parsed multipart search result', async () => {
    const user = userEvent.setup();
    const { chromeMock } = createChromeMock();
    (globalThis as any).chrome = chromeMock;

    const storageManager = buildStorageManager([]);
    renderFavList(storageManager);

    await user.click(screen.getByTestId('mock-search'));

    await waitFor(() => {
      expect(screen.getByTestId('mock-fav')).toHaveAttribute('data-favid', 'FavList-Search');
      expect(screen.getByTestId('mock-fav')).toHaveAttribute('data-songcount', '2');
    });

    await user.click(screen.getByTestId('search-list-add-to-fav'));
    expect(await screen.findByRole('dialog')).toHaveTextContent('添加到歌单');

    await user.click(screen.getByTestId('create-and-add-fav'));

    const nameInput = await screen.findByLabelText('新歌单名称');
    await user.type(nameInput, '  我的一次性歌单  ');
    expect(screen.getByText('将直接创建新歌单并放入 2 首歌曲')).toBeInTheDocument();

    await user.click(screen.getByTestId('confirm-add-fav'));

    await waitFor(() => {
      expect(storageManager.addFavList).toHaveBeenCalledWith('我的一次性歌单');
      expect(storageManager.updateFavList).toHaveBeenCalledWith({
        info: { id: 'FavList-new-1', title: '我的一次性歌单', source: { type: 'bvid', bvid: 'BV_MULTI' } },
        songList: SEARCH_RESULT.songList,
      });
    });

    // the freshly created playlist becomes the selected one
    await waitFor(() => {
      expect(screen.getByTestId('mock-fav')).toHaveAttribute('data-favid', 'FavList-new-1');
      expect(screen.getByTestId('mock-fav')).toHaveAttribute('data-title', '我的一次性歌单');
      expect(screen.getByTestId('mock-fav')).toHaveAttribute('data-songcount', '2');
    });
  });

  it('keeps the previous behaviour of adding to an existing playlist', async () => {
    const user = userEvent.setup();
    const { chromeMock } = createChromeMock();
    (globalThis as any).chrome = chromeMock;

    const existingFav = {
      info: { id: 'FavList-1', title: '已有歌单', currentTableInfo: {} },
      songList: [{ id: 'old1', bvid: 'BV_OLD', name: '老歌', singer: 'up', singerId: 8, cover: 'cover' }],
    };
    const storageManager = buildStorageManager([existingFav]);
    renderFavList(storageManager);

    await user.click(screen.getByTestId('mock-search'));
    await waitFor(() => expect(screen.getByTestId('mock-fav')).toHaveAttribute('data-songcount', '2'));

    await user.click(screen.getByTestId('search-list-add-to-fav'));
    expect(await screen.findByRole('dialog')).toHaveTextContent('添加到歌单');

    expect(screen.getByTestId('confirm-add-fav')).toBeDisabled();

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: '已有歌单' }));
    await user.click(screen.getByTestId('confirm-add-fav'));

    await waitFor(() => {
      expect(storageManager.addFavList).not.toHaveBeenCalled();
      const updated = storageManager.updateFavList.mock.calls[0][0];
      expect(updated.info.id).toBe('FavList-1');
      expect(updated.songList.map((song: any) => song.id)).toEqual(['c1', 'c2', 'old1']);
    });
  });

  it('does not create a playlist when the new name is blank', async () => {
    const user = userEvent.setup();
    const { chromeMock } = createChromeMock();
    (globalThis as any).chrome = chromeMock;

    const storageManager = buildStorageManager([]);
    renderFavList(storageManager);

    await user.click(screen.getByTestId('mock-search'));
    await user.click(screen.getByTestId('search-list-add-to-fav'));
    await user.click(await screen.findByTestId('create-and-add-fav'));

    const nameInput = await screen.findByLabelText('新歌单名称');
    await user.type(nameInput, '   ');

    expect(screen.getByTestId('confirm-add-fav')).toBeDisabled();

    expect(storageManager.addFavList).not.toHaveBeenCalled();
    expect(storageManager.updateFavList).not.toHaveBeenCalled();
  });
});
