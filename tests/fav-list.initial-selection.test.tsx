/** @vitest-environment jsdom */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

vi.mock('../src/components/Search', () => ({
  Search: () => <div data-testid='mock-search' />,
}));

vi.mock('../src/components/Fav', () => ({
  Fav: ({ FavList: current }: any) => <div data-testid='selected-fav'>{current.info.title}</div>,
}));

vi.mock('../src/components/ConfirmDialog', () => ({
  AlertDialog: () => null,
}));

vi.mock('../src/components/AddFavDialog', () => ({
  AddFavDialog: () => null,
  NewFavDialog: () => null,
  HelpDialog: () => null,
}));

const mockLists = [
  { info: { id: 'FavList-1', title: 'First List' }, songList: [] },
  { info: { id: 'FavList-2', title: 'Second List' }, songList: [] },
];

const renderFavList = async (selectedFavId?: string) => {
  const fakeStorage = {
    latestFavLists: [...mockLists],
    setFavLists: (_lists: any[]) => undefined,
    initFavLists: vi.fn().mockImplementation(async function (this: any) {
      this.setFavLists([...mockLists]);
    }),
    getPlayerSetting: vi.fn().mockResolvedValue(selectedFavId ? { selectedFavId } : {}),
    setPlayerSetting: vi.fn(),
    updateFavList: vi.fn(),
    deleteFavList: vi.fn(),
    addFavList: vi.fn(),
    exportStorage: vi.fn(),
    importStorage: vi.fn(),
  } as any;

  render(
    <StorageManagerCtx.Provider value={fakeStorage}>
      <FavList
        onPlayOneFromFav={vi.fn()}
        onPlayAllFromFav={vi.fn()}
        onAddFavToList={vi.fn()}
        onAddOneFromFav={vi.fn()}
      />
    </StorageManagerCtx.Provider>,
  );

  await screen.findByTestId('mock-search');
  return fakeStorage;
};

describe('FavList initial selection', () => {
  beforeEach(() => {
    const { chromeMock } = createChromeMock();
    (globalThis as any).chrome = chromeMock;
  });

  it('defaults to the first playlist when there is no saved selection', async () => {
    const fakeStorage = await renderFavList();

    await waitFor(() => {
      expect(screen.getByTestId('selected-fav')).toHaveTextContent('First List');
    });

    expect(fakeStorage.setPlayerSetting).toHaveBeenCalledWith(expect.objectContaining({ selectedFavId: 'FavList-1' }));
  });

  it('restores the previously selected playlist when available', async () => {
    const fakeStorage = await renderFavList('FavList-2');

    await waitFor(() => {
      expect(screen.getByTestId('selected-fav')).toHaveTextContent('Second List');
    });

    expect(fakeStorage.getPlayerSetting).toHaveBeenCalled();
  });
});
