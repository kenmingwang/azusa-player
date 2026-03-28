/** @vitest-environment jsdom */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Lyric } from '../src/components/Lyric';

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
    return <div data-testid='mock-lrc' />;
  },
}));

vi.mock('../src/components/LyricSearchBar', () => ({
  LyricSearchBar: (props: any) => {
    latestSearchBarProps = props;
    return <div data-testid='mock-lyric-search' data-songid={props.SongId} />;
  },
}));

describe('Lyric panel regression', () => {
  beforeEach(() => {
    latestLrcProps = null;
    latestSearchBarProps = null;
  });

  it('keeps 3-second recover interval and tolerates missing audioId', async () => {
    const fakeStorage = {
      getLyricDetail: vi.fn().mockResolvedValue(undefined),
      setLyricOffset: vi.fn(),
      getPlayerSetting: vi.fn().mockResolvedValue(undefined),
      setPlayerSetting: vi.fn(),
    } as any;

    render(
      <StorageManagerCtx.Provider value={fakeStorage}>
        <Lyric currentTime={12} audioName='Aimer - brave shine' audioId={undefined} audioCover='cover' artist='Aimer' />
      </StorageManagerCtx.Provider>,
    );

    expect(await screen.findByTestId('mock-lrc')).toBeInTheDocument();
    expect(latestLrcProps.intervalOfRecoveringAutoScrollAfterUserScroll).toBe(3000);
    expect(fakeStorage.getLyricDetail).not.toHaveBeenCalled();
    expect(latestSearchBarProps.SongId).toBe('');
  });

  it('restores and persists lyric font size settings', async () => {
    const fakeStorage = {
      getLyricDetail: vi.fn().mockResolvedValue(undefined),
      setLyricOffset: vi.fn(),
      getPlayerSetting: vi.fn().mockResolvedValue({ lyricFontSize: 20 }),
      setPlayerSetting: vi.fn(),
    } as any;

    render(
      <StorageManagerCtx.Provider value={fakeStorage}>
        <Lyric currentTime={3} audioName='Aimer - brave shine' audioId='1' audioCover='cover' artist='Aimer' />
      </StorageManagerCtx.Provider>,
    );

    expect(await screen.findByDisplayValue('20')).toBeInTheDocument();

    const fontSizeInput = screen.getByDisplayValue('20');
    expect(latestLrcProps.lineRenderer({ line: { content: 'a' }, active: false }).props.style.fontSize).toBe('20px');

    fireEvent.change(fontSizeInput, { target: { value: '18' } });

    await waitFor(() => {
      expect(fakeStorage.setPlayerSetting).toHaveBeenCalledWith({ lyricFontSize: 18 });
    });
  });

  it('resets lyric search textbox to current song title after track switch', async () => {
    const fakeStorage = {
      getLyricDetail: vi.fn().mockResolvedValue(undefined),
      setLyricOffset: vi.fn(),
      getPlayerSetting: vi.fn().mockResolvedValue(undefined),
      setPlayerSetting: vi.fn(),
    } as any;

    const { rerender } = render(
      <StorageManagerCtx.Provider value={fakeStorage}>
        <Lyric currentTime={3} audioName='Aimer - brave shine' audioId='1' audioCover='cover' artist='Aimer' />
      </StorageManagerCtx.Provider>,
    );

    expect(await screen.findByDisplayValue('brave shine')).toBeInTheDocument();

    const searchInput = screen.getByDisplayValue('brave shine');
    fireEvent.change(searchInput, { target: { value: 'old lyric name' } });
    expect(screen.getByDisplayValue('old lyric name')).toBeInTheDocument();

    rerender(
      <StorageManagerCtx.Provider value={fakeStorage}>
        <Lyric currentTime={5} audioName='EGOIST - Departures' audioId='2' audioCover='cover-2' artist='EGOIST' />
      </StorageManagerCtx.Provider>,
    );

    expect(await screen.findByDisplayValue('Departures')).toBeInTheDocument();
  });

  it('clears stale lyric candidate binding when switching tracks', async () => {
    let resolveFirstDetail: ((value: any) => void) | null = null;
    const fakeStorage = {
      getLyricDetail: vi
        .fn()
        .mockImplementationOnce(() => new Promise((resolve) => { resolveFirstDetail = resolve; }))
        .mockResolvedValueOnce(undefined),
      setLyricOffset: vi.fn(),
      getPlayerSetting: vi.fn().mockResolvedValue(undefined),
      setPlayerSetting: vi.fn(),
    } as any;

    const { rerender } = render(
      <StorageManagerCtx.Provider value={fakeStorage}>
        <Lyric currentTime={3} audioName='Singer - First Song' audioId='1' audioCover='cover' artist='Singer' />
      </StorageManagerCtx.Provider>,
    );

    rerender(
      <StorageManagerCtx.Provider value={fakeStorage}>
        <Lyric currentTime={5} audioName='Singer - Second Song' audioId='2' audioCover='cover-2' artist='Singer' />
      </StorageManagerCtx.Provider>,
    );

    resolveFirstDetail?.({ songMid: 'mid-old', label: 'old option' });

    await waitFor(() => {
      expect(latestSearchBarProps.SongId).toBe('2');
      expect(latestSearchBarProps.localOption).toBeNull();
    });
  });
});
