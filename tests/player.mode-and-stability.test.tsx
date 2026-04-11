/** @vitest-environment jsdom */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StorageManagerCtx from '../src/popup/App';
import { Player } from '../src/components/Player';
import { createChromeMock } from './helpers/chrome-mock';

let latestJkProps: any = null;
let latestFavListProps: any = null;
let latestLyricOverlayProps: any = null;

vi.mock('react-jinke-music-player', () => ({
  default: (props: any) => {
    latestJkProps = props;
    return (
      <div data-testid='jk-player'>
        <button onClick={() => props.onPlayModeChange?.('shufflePlay')}>to-shuffle</button>
        <button onClick={() => props.onCoverClick?.()}>cover-toggle</button>
      </div>
    );
  },
}));

vi.mock('../src/components/FavList', () => ({
  FavList: (props: any) => {
    latestFavListProps = props;
    return (
      <div data-testid='fav-list'>
        <button onClick={() => props.onDarkModeChange?.(!props.darkMode)}>toggle-dark</button>
        <button
          onClick={() =>
            props.onPlayOneFromFav?.([
              {
                id: 'search-song',
                bvid: 'BV-search',
                name: 'Search Result Song',
                singer: 'Singer',
                cover: 'cover',
                musicSrc: () => Promise.resolve('url'),
              },
            ])
          }
        >
          play-search-song
        </button>
      </div>
    );
  },
}));

vi.mock('../src/components/LyricOverlay', () => ({
  LyricOverlay: (props: any) => {
    latestLyricOverlayProps = props;
    return props.showLyric ? (
      <div data-testid='lyric-overlay'>
        <button onClick={() => props.onRequestClose?.()}>close-lyric</button>
      </div>
    ) : null;
  },
}));

const makeSongs = (n: number) =>
  Array.from({ length: n }).map((_, i) => ({
    id: `id-${i}`,
    bvid: `BV-${i}`,
    name: `Song-${i}`,
    singer: 'Singer',
    cover: 'cover',
    singerId: `${i}`,
    musicSrc: () => Promise.resolve('url'),
  }));

describe('Player mode and stability regression', () => {
  beforeEach(() => {
    latestJkProps = null;
    latestFavListProps = null;
    latestLyricOverlayProps = null;
    document.body.dataset.theme = 'light';
    const { chromeMock } = createChromeMock();
    (globalThis as any).chrome = chromeMock;
  });

  it('applies play mode changes to the active queue immediately while keeping the current song', async () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
    const songs = makeSongs(6);
    const updatePlayIndex = vi.fn();

    const fakeStorage = {
      getPlayerSetting: vi.fn().mockResolvedValue({ playMode: 'order', defaultVolume: 0.5 }),
      setPlayerSetting: vi.fn(),
      setLastPlayList: vi.fn(),
    } as any;

    render(
      <StorageManagerCtx.Provider value={fakeStorage}>
        <Player songList={songs as any} />
      </StorageManagerCtx.Provider>,
    );

    await screen.findByTestId('jk-player');
    await waitFor(() => expect(latestJkProps?.audioLists?.length).toBe(6));
    latestJkProps.getAudioInstance({ updatePlayIndex, playByIndex: vi.fn() });
    latestJkProps.onAudioPlay(songs[2]);

    const originalOrder = latestJkProps.audioLists.map((song: any) => song.id);
    expect(latestJkProps.playMode).toBe('order');

    latestJkProps.onPlayModeChange('shufflePlay');

    await waitFor(() => {
      expect(latestJkProps.playMode).toBe('shufflePlay');
      expect(latestJkProps.audioLists).toHaveLength(6);
    });
    const shuffledOrder = latestJkProps.audioLists.map((song: any) => song.id);
    expect(shuffledOrder[0]).toBe('id-2');
    expect(shuffledOrder).not.toEqual(originalOrder);
    await waitFor(() => expect(updatePlayIndex).toHaveBeenCalledWith(0));

    latestJkProps.onPlayModeChange('singleLoop');
    await waitFor(() => expect(latestJkProps.playMode).toBe('singleLoop'));
    expect(latestJkProps.audioLists.map((song: any) => song.id)).toEqual(shuffledOrder);

    latestJkProps.onPlayModeChange('order');
    await waitFor(() => {
      expect(latestJkProps.playMode).toBe('order');
      expect(latestJkProps.audioLists.map((song: any) => song.id)).toEqual(originalOrder);
    });
    await waitFor(() => expect(updatePlayIndex).toHaveBeenCalledWith(2));

    expect(fakeStorage.setPlayerSetting).toHaveBeenCalledWith(
      expect.objectContaining({ playMode: 'shufflePlay' }),
    );
    expect(fakeStorage.setPlayerSetting).toHaveBeenCalledWith(
      expect.objectContaining({ playMode: 'singleLoop' }),
    );
    expect(fakeStorage.setPlayerSetting).toHaveBeenCalledWith(
      expect.objectContaining({ playMode: 'order' }),
    );

    randomSpy.mockRestore();
  });

  it('dedupes huge audio list updates (stress)', async () => {
    const songs = makeSongs(3);
    const fakeStorage = {
      getPlayerSetting: vi.fn().mockResolvedValue({ playMode: 'order', defaultVolume: 0.5 }),
      setPlayerSetting: vi.fn(),
      setLastPlayList: vi.fn(),
    } as any;

    render(
      <StorageManagerCtx.Provider value={fakeStorage}>
        <Player songList={songs as any} />
      </StorageManagerCtx.Provider>,
    );

    await screen.findByTestId('jk-player');

    const big = Array.from({ length: 4000 }).map((_, i) => ({
      id: `dup-${i % 500}`,
      bvid: `BV-${i % 500}`,
      name: `Song-${i % 500}`,
      singer: 'Singer',
      cover: 'cover',
      singerId: `${i}`,
      musicSrc: () => Promise.resolve('url'),
    }));

    latestJkProps.onAudioListsChange('id-0', big);

    expect(fakeStorage.setLastPlayList).toHaveBeenCalled();
    const deduped = fakeStorage.setLastPlayList.mock.calls.at(-1)[0];
    expect(deduped).toHaveLength(500);
  });

  it('does not leak keydown listeners across mount/unmount', async () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const fakeStorage = {
      getPlayerSetting: vi.fn().mockResolvedValue({ playMode: 'order', defaultVolume: 0.5 }),
      setPlayerSetting: vi.fn(),
      setLastPlayList: vi.fn(),
    } as any;

    const { unmount } = render(
      <StorageManagerCtx.Provider value={fakeStorage}>
        <Player songList={makeSongs(2) as any} />
      </StorageManagerCtx.Provider>,
    );

    await screen.findByTestId('jk-player');

    unmount();

    const addKeydown = addSpy.mock.calls.filter((c) => c[0] === 'keydown').length;
    const removeKeydown = removeSpy.mock.calls.filter((c) => c[0] === 'keydown').length;
    expect(removeKeydown).toBe(addKeydown);
  });

  it('passes current track and dark mode controls into playlist panel', async () => {
    const user = userEvent.setup();
    const fakeStorage = {
      getPlayerSetting: vi.fn().mockResolvedValue({ playMode: 'order', defaultVolume: 0.5, darkMode: false }),
      setPlayerSetting: vi.fn(),
      setLastPlayList: vi.fn(),
    } as any;

    render(
      <StorageManagerCtx.Provider value={fakeStorage}>
        <Player songList={makeSongs(2) as any} />
      </StorageManagerCtx.Provider>,
    );

    await screen.findByTestId('fav-list');
    expect(latestFavListProps.darkMode).toBe(false);

    latestJkProps.onAudioProgress({ id: 'id-1', currentTime: 12 });
    await waitFor(() => expect(latestFavListProps.currentAudioId).toBe('id-1'));

    await user.click(screen.getByRole('button', { name: 'toggle-dark' }));

    await waitFor(() => {
      expect(fakeStorage.setPlayerSetting).toHaveBeenCalledWith(
        expect.objectContaining({ darkMode: true }),
      );
      expect(document.body.dataset.theme).toBe('dark');
    });
  });

  it('reopens lyric overlay immediately after closing from overlay action', async () => {
    const user = userEvent.setup();
    const fakeStorage = {
      getPlayerSetting: vi.fn().mockResolvedValue({ playMode: 'order', defaultVolume: 0.5, darkMode: false }),
      setPlayerSetting: vi.fn(),
      setLastPlayList: vi.fn(),
    } as any;

    render(
      <StorageManagerCtx.Provider value={fakeStorage}>
        <Player songList={makeSongs(2) as any} />
      </StorageManagerCtx.Provider>,
    );

    await screen.findByTestId('jk-player');

    latestJkProps.onAudioProgress({ id: 'id-0', currentTime: 12, name: 'Song-0', singer: 'Singer', cover: 'cover' });

    await user.click(screen.getByRole('button', { name: 'cover-toggle' }));
    await waitFor(() => expect(screen.getByTestId('lyric-overlay')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'close-lyric' }));
    await waitFor(() => expect(screen.queryByTestId('lyric-overlay')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'cover-toggle' }));
    await waitFor(() => expect(screen.getByTestId('lyric-overlay')).toBeInTheDocument());
    expect(latestLyricOverlayProps.showLyric).toBe(true);
  });

  it('throttles lyric time UI updates during rapid progress events', async () => {
    let fakeNow = 1000;
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => fakeNow);

    const fakeStorage = {
      getPlayerSetting: vi.fn().mockResolvedValue({ playMode: 'order', defaultVolume: 0.5, darkMode: false }),
      setPlayerSetting: vi.fn(),
      setLastPlayList: vi.fn(),
    } as any;

    render(
      <StorageManagerCtx.Provider value={fakeStorage}>
        <Player songList={makeSongs(2) as any} />
      </StorageManagerCtx.Provider>,
    );

    await screen.findByTestId('jk-player');

    latestJkProps.onAudioProgress({ id: 'id-0', currentTime: 1, name: 'Song-0', singer: 'Singer', cover: 'cover' });
    await waitFor(() => expect(latestLyricOverlayProps.currentTime).toBe(1));

    fakeNow += 80;
    latestJkProps.onAudioProgress({ id: 'id-0', currentTime: 1.2, name: 'Song-0', singer: 'Singer', cover: 'cover' });
    expect(latestLyricOverlayProps.currentTime).toBe(1);

    fakeNow += 220;
    latestJkProps.onAudioProgress({ id: 'id-0', currentTime: 1.4, name: 'Song-0', singer: 'Singer', cover: 'cover' });
    await waitFor(() => expect(latestLyricOverlayProps.currentTime).toBe(1.4));

    nowSpy.mockRestore();
  });

  it('clears legacy progress data and no longer persists playback progress', async () => {
    const { chromeMock } = createChromeMock({
      SongProgressMap: { 'id-1': 98 },
    });
    (globalThis as any).chrome = chromeMock;

    const fakeStorage = {
      getPlayerSetting: vi.fn().mockResolvedValue({ playMode: 'order', defaultVolume: 0.5, darkMode: false }),
      setPlayerSetting: vi.fn(),
      setLastPlayList: vi.fn(),
    } as any;

    render(
      <StorageManagerCtx.Provider value={fakeStorage}>
        <Player songList={makeSongs(2) as any} />
      </StorageManagerCtx.Provider>,
    );

    await screen.findByTestId('jk-player');
    expect(chromeMock.storage.local.remove).toHaveBeenCalledWith('SongProgressMap');

    latestJkProps.onAudioPlay(makeSongs(2)[1]);
    latestJkProps.onAudioProgress({ id: 'id-1', currentTime: 98, name: 'Song-1', singer: 'Singer', cover: 'cover' });

    const wroteSongProgressMap = chromeMock.storage.local.set.mock.calls.some(
      ([payload]: [Record<string, unknown>]) => Object.prototype.hasOwnProperty.call(payload || {}, 'SongProgressMap'),
    );
    const readSongProgressMap = chromeMock.storage.local.get.mock.calls.some(
      ([keys]: [unknown]) => Array.isArray(keys) && keys.includes('SongProgressMap'),
    );

    expect(wroteSongProgressMap).toBe(false);
    expect(readSongProgressMap).toBe(false);
  });

  it('plays newly searched songs immediately after playlist insertion', async () => {
    const user = userEvent.setup();
    const playByIndex = vi.fn();
    const fakeStorage = {
      getPlayerSetting: vi.fn().mockResolvedValue({ playMode: 'order', defaultVolume: 0.5, darkMode: false }),
      setPlayerSetting: vi.fn(),
      setLastPlayList: vi.fn(),
    } as any;

    render(
      <StorageManagerCtx.Provider value={fakeStorage}>
        <Player songList={makeSongs(2) as any} />
      </StorageManagerCtx.Provider>,
    );

    await screen.findByTestId('jk-player');
    latestJkProps.getAudioInstance({ playByIndex });

    await user.click(screen.getByRole('button', { name: 'play-search-song' }));

    await waitFor(() => {
      expect(playByIndex).toHaveBeenCalledWith(0);
      expect(latestJkProps.audioLists[0]).toEqual(expect.objectContaining({ id: 'search-song' }));
    });
  });
});
