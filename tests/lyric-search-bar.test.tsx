/** @vitest-environment jsdom */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';

const searchLyricOptions = vi.fn();
const searchLyric = vi.fn();
let latestAutocompleteProps: any = null;

vi.mock('../src/popup/App', async () => {
  const ReactModule = await import('react');
  return {
    __esModule: true,
    default: ReactModule.createContext<any>(null),
    App: () => null,
  };
});

vi.mock('../src/utils/Data', () => ({
  searchLyricOptions: (...args: any[]) => searchLyricOptions(...args),
  searchLyric: (...args: any[]) => searchLyric(...args),
}));

vi.mock('@mui/material/Autocomplete', () => ({
  default: (props: any) => {
    latestAutocompleteProps = props;
    return <div data-testid='autocomplete' data-value={props.value?.label || ''} />;
  },
}));

// eslint-disable-next-line import/first
import StorageManagerCtx from '../src/popup/App';
// eslint-disable-next-line import/first
import { LyricSearchBar } from '../src/components/LyricSearchBar';

describe('LyricSearchBar regression', () => {
  beforeEach(() => {
    latestAutocompleteProps = null;
    searchLyricOptions.mockReset();
    searchLyric.mockReset();
  });

  it('clears previous selected lyric option when switching songs', async () => {
    searchLyricOptions.mockImplementation((key: string, cb: (options: any[]) => void) => {
      if (key === 'Song A') {
        cb([{ key: 'a', songMid: 'mid-a', label: '0. Song A' }]);
        return;
      }
      cb([{ key: 'b', songMid: 'mid-b', label: '0. Song B' }]);
    });

    const fakeStorage = {
      setLyricDetail: vi.fn(),
    } as any;

    const { rerender } = render(
      <StorageManagerCtx.Provider value={fakeStorage}>
        <LyricSearchBar SearchKey='Song A' SongId='song-a' setLyric={vi.fn()} />
      </StorageManagerCtx.Provider>,
    );

    await waitFor(() => expect(latestAutocompleteProps?.value?.label).toBe('0. Song A'));

    rerender(
      <StorageManagerCtx.Provider value={fakeStorage}>
        <LyricSearchBar SearchKey='Song B' SongId='song-b' setLyric={vi.fn()} />
      </StorageManagerCtx.Provider>,
    );

    await waitFor(() => expect(latestAutocompleteProps?.value?.label).toBe('0. Song B'));
    expect(fakeStorage.setLyricDetail).toHaveBeenLastCalledWith('song-b', expect.objectContaining({ songMid: 'mid-b' }));
  });

  it('ignores stale option callbacks from the previous song', async () => {
    let songACallback: ((options: any[]) => void) | null = null;
    let songBCallback: ((options: any[]) => void) | null = null;

    searchLyricOptions.mockImplementation((key: string, cb: (options: any[]) => void) => {
      if (key === 'Song A') {
        songACallback = cb;
        return;
      }
      songBCallback = cb;
    });

    const fakeStorage = {
      setLyricDetail: vi.fn(),
    } as any;

    const { rerender } = render(
      <StorageManagerCtx.Provider value={fakeStorage}>
        <LyricSearchBar SearchKey='Song A' SongId='song-a' setLyric={vi.fn()} />
      </StorageManagerCtx.Provider>,
    );

    rerender(
      <StorageManagerCtx.Provider value={fakeStorage}>
        <LyricSearchBar SearchKey='Song B' SongId='song-b' setLyric={vi.fn()} />
      </StorageManagerCtx.Provider>,
    );

    songACallback?.([{ key: 'a', songMid: 'mid-a', label: '0. Song A' }]);
    expect(latestAutocompleteProps?.value).toBeUndefined();

    songBCallback?.([{ key: 'b', songMid: 'mid-b', label: '0. Song B' }]);
    await waitFor(() => expect(latestAutocompleteProps?.value?.label).toBe('0. Song B'));
  });
});
