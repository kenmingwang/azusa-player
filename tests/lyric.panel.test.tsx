/** @vitest-environment jsdom */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
