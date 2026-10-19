/** @vitest-environment jsdom */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VideoSearchDialog } from '../src/components/VideoSearchDialog';

const mocks = vi.hoisted(() => ({ search: vi.fn(), getSongList: vi.fn() }));
vi.mock('../src/utils/videoSearch', () => ({ searchBilibiliVideos: mocks.search }));
vi.mock('../src/background/DataProcess', () => ({ getSongList: mocks.getSongList }));
const video = { bvid: 'BV1yNPbzjEVq', title: '晴天', author: 'UP主', cover: '', duration: '4:30', playCount: 123 };
const page = (pageNumber = 1) => ({ videos: [{ ...video, title: pageNumber === 1 ? '晴天' : '第二页歌曲' }], page: pageNumber, totalPages: 2, totalResults: 30 });
const song = { id: 'cid-1', bvid: video.bvid, name: '晴天' };
const mount = () => {
  const callbacks = { onPlay: vi.fn(), onAdd: vi.fn(), onClose: vi.fn() };
  const view = render(<VideoSearchDialog keyword='周杰伦' {...callbacks} />);
  return { ...callbacks, ...view };
};

beforeEach(() => { mocks.search.mockReset(); mocks.getSongList.mockReset(); mocks.search.mockResolvedValue(page()); });

describe('keyword search result actions', () => {
  it('loads only search metadata until the user selects a result, then plays through the existing callback', async () => {
    const user = userEvent.setup();
    mocks.getSongList.mockResolvedValue([song]);
    const callbacks = mount();
    await screen.findByText('晴天');
    expect(mocks.getSongList).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '播放', exact: true }));
    await waitFor(() => expect(callbacks.onPlay).toHaveBeenCalledWith([song]));
    expect(callbacks.onClose).toHaveBeenCalledOnce();
    expect(callbacks.onAdd).not.toHaveBeenCalled();
  });

  it('adds a single result to the existing playlist picker', async () => {
    const user = userEvent.setup();
    mocks.getSongList.mockResolvedValue([song]);
    const callbacks = mount();
    await screen.findByText('晴天');
    await user.click(screen.getByRole('button', { name: '加入歌单', exact: true }));
    await waitFor(() => expect(callbacks.onAdd).toHaveBeenCalledWith([song]));
    expect(callbacks.onPlay).not.toHaveBeenCalled();
  });

  it('expands multi-part videos and plays only the chosen part', async () => {
    const user = userEvent.setup();
    const secondSong = { ...song, id: 'cid-2', name: '夜曲' };
    mocks.getSongList.mockResolvedValue([song, secondSong]);
    const callbacks = mount();
    await screen.findByText('晴天');
    await user.click(screen.getByRole('button', { name: '播放', exact: true }));
    await screen.findByRole('button', { name: '播放 P2' });
    expect(callbacks.onPlay).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '播放 P2' }));
    expect(callbacks.onPlay).toHaveBeenCalledWith([secondSong]);
  });

  it('keeps the successful page after a failed page request and retries the requested page', async () => {
    const user = userEvent.setup();
    const callbacks = mount();
    await screen.findByText('晴天');
    mocks.search.mockRejectedValueOnce(new Error('网络暂时不可用')).mockResolvedValueOnce(page(2));
    await user.click(screen.getByRole('button', { name: 'Go to page 2' }));
    await screen.findByText('网络暂时不可用');
    expect(screen.getByText('晴天')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '重试' }));
    await screen.findByText('第二页歌曲');
    expect(mocks.search.mock.calls.at(-1)?.[1]).toBe(2);
    expect(callbacks.onPlay).not.toHaveBeenCalled();
  });

  it('does not play a late video response after the dialog is unmounted', async () => {
    const user = userEvent.setup();
    let resolve!: (songs: unknown[]) => void;
    mocks.getSongList.mockReturnValue(new Promise((done) => { resolve = done; }));
    const callbacks = mount();
    await screen.findByText('晴天');
    await user.click(screen.getByRole('button', { name: '播放', exact: true }));
    callbacks.unmount();
    await act(async () => resolve([song]));
    expect(callbacks.onPlay).not.toHaveBeenCalled();
  });

  it('shows a useful error when a result no longer resolves', async () => {
    const user = userEvent.setup();
    mocks.getSongList.mockResolvedValue([]);
    const callbacks = mount();
    await screen.findByText('晴天');
    await user.click(screen.getByRole('button', { name: '播放', exact: true }));
    await screen.findByText(/视频可能已失效/);
    expect(callbacks.onPlay).not.toHaveBeenCalled();
  });
});
