/** @vitest-environment jsdom */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Fav } from '../src/components/Fav';

const buildFavList = () => ({
  info: { id: 'FavList-1', title: '测试歌单', currentTableInfo: {} },
  songList: [
    { id: 's1', name: 'Song One', singer: 'Singer One', singerId: '1', bvid: 'BV_A' },
    { id: 's2', name: 'Song Two', singer: 'Singer Two', singerId: '2', bvid: 'BV_B' },
  ],
});

describe('Fav table user interactions', () => {
  it('supports play and batch delete selected songs', async () => {
    const user = userEvent.setup();

    const onSongIndexChange = vi.fn();
    const onAddOneFromFav = vi.fn();
    const handleDeleteSongs = vi.fn();

    render(
      <Fav
        FavList={buildFavList() as any}
        onSongIndexChange={onSongIndexChange}
        onAddOneFromFav={onAddOneFromFav}
        handleDelteFromSearchList={vi.fn()}
        handleAddToFavClick={vi.fn()}
        handleDeleteSongs={handleDeleteSongs}
        handleRenameSong={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Song One' }));
    expect(onSongIndexChange).toHaveBeenCalledWith([
      expect.objectContaining({ id: 's1', name: 'Song One' }),
    ]);

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);

    await user.click(screen.getByRole('button', { name: /加入播放列表\(1\)/ }));
    expect(onAddOneFromFav).toHaveBeenCalledWith([
      expect.objectContaining({ id: 's1' }),
    ]);

    await user.click(screen.getByRole('button', { name: '删除选中' }));

    await waitFor(() => {
      expect(handleDeleteSongs).toHaveBeenCalledWith(
        'FavList-1',
        ['s1'],
        expect.objectContaining({ page: 0, rowsPerPage: 25 }),
      );
    });
  });

  it('shows refresh action for source-backed playlists', async () => {
    const user = userEvent.setup();
    const onRefreshFromSource = vi.fn();

    render(
      <Fav
        FavList={{ ...buildFavList(), info: { ...buildFavList().info, source: { type: 'fav', mid: '1042352181' } } } as any}
        onSongIndexChange={vi.fn()}
        onAddOneFromFav={vi.fn()}
        onRefreshFromSource={onRefreshFromSource}
        handleDelteFromSearchList={vi.fn()}
        handleAddToFavClick={vi.fn()}
        handleDeleteSongs={vi.fn()}
        handleRenameSong={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: '刷新来源' }));
    expect(onRefreshFromSource).toHaveBeenCalledWith(
      expect.objectContaining({
        info: expect.objectContaining({ source: { type: 'fav', mid: '1042352181' } }),
      }),
    );
  });

  it('clears stale filter text when a locate highlight is requested', async () => {
    render(
      <Fav
        FavList={{
          info: {
            ...buildFavList().info,
            currentTableInfo: { filterString: 'no-match', highlightSongId: 's1', page: 0, rowsPerPage: 25 },
          },
          songList: buildFavList().songList,
        } as any}
        currentAudioId='s1'
        onSongIndexChange={vi.fn()}
        onAddOneFromFav={vi.fn()}
        handleDelteFromSearchList={vi.fn()}
        handleAddToFavClick={vi.fn()}
        handleDeleteSongs={vi.fn()}
        handleRenameSong={vi.fn()}
      />,
    );

    expect(await screen.findByRole('button', { name: 'Song One' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('')).toBeInTheDocument();
  });
});
