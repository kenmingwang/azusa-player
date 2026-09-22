/** @vitest-environment jsdom */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const downloadSongsToLocal = vi.hoisted(() => vi.fn());
vi.mock('../src/utils/downloader', () => ({ downloadSongsToLocal }));

const requestAudioQuality = vi.hoisted(() => vi.fn());
vi.mock('../src/utils/audioQuality', () => ({
  audioQualityKey: (bvid?: string, cid?: string) => (bvid && cid ? `${bvid}:${cid}` : ''),
  getCachedAudioQuality: () => undefined,
  subscribeAudioQuality: () => () => undefined,
  resetAudioQualityCache: vi.fn(),
  requestAudioQuality,
}));

const qualityFixture = {
  qualityId: 30280,
  label: '192K',
  title: '192K AAC',
  codecs: 'mp4a.40.2',
  bandwidth: 319101,
  mimeType: 'audio/mp4',
  extension: 'm4a',
  url: 'https://example.com/audio.m4s',
  fetchedAt: 0,
};

// eslint-disable-next-line import/first
import { Fav } from '../src/components/Fav';

const buildFavList = () => ({
  info: { id: 'FavList-1', title: '测试歌单', currentTableInfo: {} },
  songList: [
    { id: 's1', name: 'Song One', singer: 'Singer One', singerId: '1', bvid: 'BV_A' },
    { id: 's2', name: 'Song Two', singer: 'Singer Two', singerId: '2', bvid: 'BV_B' },
  ],
});

const renderFav = (favList = buildFavList()) =>
  render(
    <Fav
      FavList={favList as any}
      onSongIndexChange={vi.fn()}
      onAddOneFromFav={vi.fn()}
      handleDelteFromSearchList={vi.fn()}
      handleAddToFavClick={vi.fn()}
      handleDeleteSongs={vi.fn()}
      handleRenameSong={vi.fn()}
    />,
  );

describe('Fav table audio quality and downloads', () => {
  beforeEach(() => {
    requestAudioQuality.mockReset();
    requestAudioQuality.mockResolvedValue(qualityFixture);
    downloadSongsToLocal.mockReset();
    downloadSongsToLocal.mockResolvedValue({ total: 1, succeeded: 1, failed: 0, skipped: 0, failures: [] });
  });

  it('shows the resolved audio quality for every row', async () => {
    renderFav();

    const badges = await screen.findAllByTestId('audio-quality');
    expect(badges).toHaveLength(2);
    expect(badges[0]).toHaveAttribute('data-quality-id', '30280');
    expect(badges[0]).toHaveAttribute('data-quality-label', '192K');
    expect(badges[0]).toHaveTextContent('192K');
  });

  it('batch downloads the selected songs at the best quality', async () => {
    const user = userEvent.setup();
    renderFav();

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);

    await user.click(screen.getByRole('button', { name: /批量下载\(1\)/ }));

    await waitFor(() => {
      expect(downloadSongsToLocal).toHaveBeenCalledWith(
        [expect.objectContaining({ id: 's1', bvid: 'BV_A' })],
        expect.objectContaining({ onProgress: expect.any(Function), isCancelled: expect.any(Function) }),
      );
    });

    expect(await screen.findByText('已按最高音质下载 1 首到浏览器下载目录。')).toBeInTheDocument();
  });

  it('downloads a single row through the row action icon', async () => {
    const user = userEvent.setup();
    renderFav();

    await user.click(screen.getByTestId('download-song-s2'));

    await waitFor(() => {
      expect(downloadSongsToLocal).toHaveBeenCalledWith(
        [expect.objectContaining({ id: 's2', bvid: 'BV_B' })],
        expect.any(Object),
      );
    });
  });

  it('reports partial failures after a batch download', async () => {
    const user = userEvent.setup();
    downloadSongsToLocal.mockResolvedValue({
      total: 1,
      succeeded: 0,
      failed: 1,
      skipped: 0,
      failures: [{ song: { id: 's1' }, error: '音频请求失败 (HTTP 403)' }],
    });

    renderFav();
    await user.click(screen.getAllByRole('checkbox')[1]);
    await user.click(screen.getByRole('button', { name: /批量下载\(1\)/ }));

    expect(await screen.findByText(/下载完成：成功 0 首，失败 1 首/)).toBeInTheDocument();
  });

  it('warns when the selection has no resolvable bvid', async () => {
    const user = userEvent.setup();
    renderFav({
      info: { id: 'FavList-1', title: '测试歌单', currentTableInfo: {} },
      songList: [{ id: 's3', name: 'No Bvid', singer: 'Singer Three', singerId: '3' }],
    });

    await user.click(screen.getAllByRole('checkbox')[1]);
    await user.click(screen.getByRole('button', { name: /批量下载\(1\)/ }));

    expect(await screen.findByText('选中的条目缺少 bvid / cid，无法下载。')).toBeInTheDocument();
    expect(downloadSongsToLocal).not.toHaveBeenCalled();
  });
});
