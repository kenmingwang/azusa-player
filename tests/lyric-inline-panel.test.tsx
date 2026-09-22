/** @vitest-environment jsdom */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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

let latestLrcProps: any = null;
let latestSearchBarProps: any = null;

vi.mock('react-lrc', () => ({
  Lrc: (props: any) => {
    latestLrcProps = props;
    const lines = [
      { id: 'l0', content: '第一句歌词', startMillisecond: 3000 },
      { id: 'l1', content: '第二句歌词', startMillisecond: 12500 },
    ];
    return (
      <div data-testid='mock-lrc'>
        {lines.map((line, index) => (
          <div key={line.id}>
            {props.lineRenderer({ index, active: index === 0, line: { ...line, lineNumber: index + 1 } })}
          </div>
        ))}
      </div>
    );
  },
}));

vi.mock('../src/components/LyricSearchBar', () => ({
  LyricSearchBar: (props: any) => {
    latestSearchBarProps = props;
    return <div data-testid='mock-lyric-search' data-songid={props.SongId} />;
  },
}));

// eslint-disable-next-line import/first
import LyricPanel from '../src/components/LyricPanel';

const buildStorage = (detail: any = undefined) =>
  ({
    getLyricDetail: vi.fn().mockResolvedValue(detail),
    setLyricOffset: vi.fn(),
    setLyricDetail: vi.fn(),
    getPlayerSetting: vi.fn().mockResolvedValue(undefined),
    setPlayerSetting: vi.fn(),
  }) as any;

const renderPanel = (props: Partial<React.ComponentProps<typeof LyricPanel>> = {}, storage = buildStorage()) =>
  render(
    <StorageManagerCtx.Provider value={storage}>
      <LyricPanel currentTime={12} audioName='【阿梓】Brave Shine【翻唱】' audioId='999' artist='阿梓' {...props} />
    </StorageManagerCtx.Provider>,
  );

describe('inline lyric panel', () => {
  beforeEach(() => {
    latestLrcProps = null;
    latestSearchBarProps = null;
  });

  it('shows the song title extracted from the playlist entry', async () => {
    renderPanel();

    await waitFor(() => expect(screen.getByTestId('lyric-panel-title')).toHaveTextContent('Brave Shine'));
  });

  it('feeds the lyric engine with playback time plus the offset', async () => {
    renderPanel();

    await waitFor(() => expect(latestLrcProps).not.toBeNull());
    expect(latestLrcProps.currentMillisecond).toBe(12000);
    expect(latestLrcProps.autoScroll).toBe(true);
    // react-lrc v3 prop names: the old code passed a name that does not exist, so the 3s recovery
    // silently fell back to the 5s default and the active line could never be centred.
    expect(latestLrcProps.recoverAutoScrollInterval).toBe(3000);
    expect(latestLrcProps.verticalSpace).toBe(true);
    expect(latestLrcProps.style.scrollBehavior).toBe('smooth');
    expect(latestLrcProps.style.padding).toBe('0 4px');
  });

  it('nudges the lyric timing by half a second and persists it', async () => {
    const user = userEvent.setup();
    const storage = buildStorage();
    renderPanel({}, storage);

    await waitFor(() => expect(screen.getByTestId('lyric-offset-value')).toHaveTextContent('±0.0s'));

    await user.click(screen.getByTestId('lyric-offset-forward'));
    expect(screen.getByTestId('lyric-offset-value')).toHaveTextContent('+0.5s');
    expect(storage.setLyricOffset).toHaveBeenLastCalledWith('999', 500);
    expect(latestLrcProps.currentMillisecond).toBe(12500);

    await user.click(screen.getByTestId('lyric-offset-forward'));
    expect(screen.getByTestId('lyric-offset-value')).toHaveTextContent('+1.0s');
    expect(latestLrcProps.currentMillisecond).toBe(13000);

    await user.click(screen.getByTestId('lyric-offset-back'));
    expect(screen.getByTestId('lyric-offset-value')).toHaveTextContent('+0.5s');

    await user.click(screen.getByTestId('lyric-offset-back'));
    expect(screen.getByTestId('lyric-offset-value')).toHaveTextContent('±0.0s');

    await user.click(screen.getByTestId('lyric-offset-back'));
    expect(screen.getByTestId('lyric-offset-value')).toHaveTextContent('-0.5s');
    expect(storage.setLyricOffset).toHaveBeenLastCalledWith('999', -500);
    expect(latestLrcProps.currentMillisecond).toBe(11500);
  });

  it('resets the offset to zero', async () => {
    const user = userEvent.setup();
    const storage = buildStorage();
    renderPanel({}, storage);

    await user.click(screen.getByTestId('lyric-offset-forward'));
    expect(screen.getByTestId('lyric-offset-value')).toHaveTextContent('+0.5s');

    await user.click(screen.getByTestId('lyric-offset-reset'));

    expect(screen.getByTestId('lyric-offset-value')).toHaveTextContent('±0.0s');
    expect(storage.setLyricOffset).toHaveBeenLastCalledWith('999', 0);
  });

  it('restores the stored offset and lyric source of the current song', async () => {
    const storage = buildStorage({
      lrcOffset: 1500,
      source: 'qq',
      id: '0032hRJU0evmPq',
      name: 'Brave Shine',
      artist: 'Aimer',
      label: '0. Brave Shine / Aimer · QQ音乐',
    });

    renderPanel({}, storage);

    await waitFor(() => expect(screen.getByTestId('lyric-offset-value')).toHaveTextContent('+1.5s'));
    expect(screen.getByTestId('lyric-panel-source')).toHaveTextContent('Brave Shine / Aimer · QQ音乐');
    expect(latestLrcProps.currentMillisecond).toBe(13500);
  });

  it('collapses to the header bar and back', async () => {
    const user = userEvent.setup();
    renderPanel();

    await waitFor(() => expect(screen.getByTestId('mock-lrc')).toBeInTheDocument());

    await user.click(screen.getByTestId('lyric-panel-toggle-collapse'));
    expect(screen.queryByTestId('mock-lrc')).not.toBeInTheDocument();
    expect(screen.getByTestId('lyric-panel-title')).toBeInTheDocument();

    await user.click(screen.getByTestId('lyric-panel-toggle-collapse'));
    expect(await screen.findByTestId('mock-lrc')).toBeInTheDocument();
  });

  it('swaps the lyric view for the candidate picker without unmounting the loader', async () => {
    const user = userEvent.setup();
    renderPanel();

    await waitFor(() => expect(screen.getByTestId('mock-lyric-search')).toBeInTheDocument());

    await user.click(screen.getByTestId('lyric-panel-toggle-picker'));

    expect(screen.getByTestId('mock-lyric-search')).toBeInTheDocument();
  });

  it('keeps the candidate loader bound to the current song id', async () => {
    renderPanel();

    await waitFor(() => expect(latestSearchBarProps?.SongId).toBe('999'));
    expect(latestSearchBarProps?.SearchKey).toBe('Brave Shine');
    expect(typeof latestSearchBarProps?.onCandidateChange).toBe('function');
  });

  it('shows a placeholder when nothing is playing', async () => {
    render(
      <StorageManagerCtx.Provider value={buildStorage()}>
        <LyricPanel currentTime={0} />
      </StorageManagerCtx.Provider>,
    );

    expect(screen.getByTestId('lyric-panel-title')).toHaveTextContent('未在播放');
  });

  it('seeks to the line time when its hover play button is clicked', async () => {
    const user = userEvent.setup();
    const onSeek = vi.fn();
    renderPanel({ onSeek });

    await waitFor(() => expect(screen.getAllByTestId('lyric-line-jump')).toHaveLength(2));

    // Second mocked line starts at 12.5s.
    await user.click(screen.getAllByTestId('lyric-line-jump')[1]);
    expect(onSeek).toHaveBeenCalledWith(12.5);
  });

  it('corrects the seek target by the lyric offset', async () => {
    const user = userEvent.setup();
    const onSeek = vi.fn();
    const storage = buildStorage(undefined);
    renderPanel({ onSeek }, storage);

    await waitFor(() => expect(screen.getAllByTestId('lyric-line-jump')).toHaveLength(2));

    // +0.5s offset means the line is displayed 0.5s earlier than the audio position it belongs to.
    await user.click(screen.getByTestId('lyric-offset-forward'));
    expect(latestLrcProps.currentMillisecond).toBe(12500);

    await user.click(screen.getAllByTestId('lyric-line-jump')[1]);
    expect(onSeek).toHaveBeenLastCalledWith(12);
  });

  it('omits the jump buttons when the player cannot seek', async () => {
    renderPanel();

    await waitFor(() => expect(screen.getByTestId('mock-lrc')).toBeInTheDocument());
    expect(screen.queryAllByTestId('lyric-line-jump')).toHaveLength(0);
  });

  it('renders the sung line with the active styling and marks it for the engine', async () => {
    renderPanel();

    await waitFor(() => expect(screen.getAllByTestId('lyric-line').length).toBeGreaterThan(0));
    const lines = screen.getAllByTestId('lyric-line');
    expect(lines[0]).toHaveAttribute('data-active', 'true');
    expect(lines[0]).toHaveAttribute('data-start-millisecond', '3000');
    expect(lines[1]).toHaveAttribute('data-active', 'false');
    expect(lines[0].querySelector('[data-testid="lyric-line-content"]')).toHaveStyle({ fontSize: '16px' });
    expect(lines[1].querySelector('[data-testid="lyric-line-content"]')).toHaveStyle({ fontSize: '13px' });
  });
});
