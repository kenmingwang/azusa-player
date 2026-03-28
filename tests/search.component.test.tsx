/** @vitest-environment jsdom */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Search } from '../src/components/Search';

const mocks = vi.hoisted(() => ({
  getSongList: vi.fn(),
  getFavList: vi.fn(),
  getBiliSeriesList: vi.fn(),
  getBiliColleList: vi.fn(),
}));

vi.mock('../src/background/DataProcess', () => ({
  getSongList: mocks.getSongList,
  getFavList: mocks.getFavList,
  getBiliSeriesList: mocks.getBiliSeriesList,
  getBiliColleList: mocks.getBiliColleList,
}));

describe('Search component regression', () => {
  beforeEach(() => {
    mocks.getSongList.mockReset();
    mocks.getFavList.mockReset();
    mocks.getBiliSeriesList.mockReset();
    mocks.getBiliColleList.mockReset();
  });

  it('searches by BVID when user presses Enter', async () => {
    const user = userEvent.setup();
    const handleSeach = vi.fn();
    mocks.getSongList.mockResolvedValue([{ id: 'cid-1', bvid: 'BV1yNPbzjEVq', name: 'song-a' }]);

    render(<Search handleSeach={handleSeach} />);

    const input = screen.getByLabelText(/BVid/i);
    await user.type(input, 'BV1yNPbzjEVq{enter}');

    await waitFor(() => {
      expect(mocks.getSongList).toHaveBeenCalledWith('BV1yNPbzjEVq');
      expect(handleSeach).toHaveBeenCalledTimes(1);
    });

    expect(handleSeach.mock.calls[0][0]).toMatchObject({
      info: {
        id: 'FavList-Search',
        title: expect.stringContaining('BV1yNPbzjEVq'),
        source: { type: 'bvid', bvid: 'BV1yNPbzjEVq' },
      },
      songList: [{ id: 'cid-1', bvid: 'BV1yNPbzjEVq', name: 'song-a' }],
    });
  });

  it('searches by favorite id when input is not BVID', async () => {
    const user = userEvent.setup();
    const handleSeach = vi.fn();
    mocks.getFavList.mockResolvedValue([{ id: 'fav-cid-1', bvid: 'BV1a', name: 'fav-song' }]);

    render(<Search handleSeach={handleSeach} />);

    const input = screen.getByLabelText(/BVid/i);
    await user.type(input, '1042352181{enter}');

    await waitFor(() => {
      expect(mocks.getFavList).toHaveBeenCalledWith('1042352181');
      expect(handleSeach).toHaveBeenCalledTimes(1);
    });

    expect(handleSeach.mock.calls[0][0]).toMatchObject({
      info: { source: { type: 'fav', mid: '1042352181' } },
    });
  });

  it('searches collection link via getBiliColleList', async () => {
    const user = userEvent.setup();
    const handleSeach = vi.fn();
    mocks.getBiliColleList.mockResolvedValue([{ id: 'c1', bvid: 'BV1b', name: 'colle' }]);

    render(<Search handleSeach={handleSeach} />);

    const input = screen.getByLabelText(/BVid/i);
    await user.type(input, 'https://space.bilibili.com/123/lists/456?type=season{enter}');

    await waitFor(() => {
      expect(mocks.getBiliColleList).toHaveBeenCalledWith('123', '456');
      expect(handleSeach).toHaveBeenCalledTimes(1);
    });

    expect(handleSeach.mock.calls[0][0]).toMatchObject({
      info: { source: { type: 'collection', mid: '123', sid: '456' } },
    });
  });

  it('searches series link via getBiliSeriesList for new lists URL', async () => {
    const user = userEvent.setup();
    const handleSeach = vi.fn();
    mocks.getBiliSeriesList.mockResolvedValue([{ id: 's1', bvid: 'BV1c', name: 'series-song' }]);

    render(<Search handleSeach={handleSeach} />);

    const input = screen.getByLabelText(/BVid/i);
    await user.type(input, 'https://space.bilibili.com/444180997/lists/828030?type=series{enter}');

    await waitFor(() => {
      expect(mocks.getBiliSeriesList).toHaveBeenCalledWith('444180997', '828030');
      expect(handleSeach).toHaveBeenCalledTimes(1);
    });

    expect(handleSeach.mock.calls[0][0]).toMatchObject({
      info: { source: { type: 'series', mid: '444180997', sid: '828030' } },
    });
    expect(mocks.getFavList).not.toHaveBeenCalled();
  });

  it('searches season link via getBiliColleList for new lists URL', async () => {
    const user = userEvent.setup();
    const handleSeach = vi.fn();
    mocks.getBiliColleList.mockResolvedValue([{ id: 'c2', bvid: 'BV1d', name: 'season-song' }]);

    render(<Search handleSeach={handleSeach} />);

    const input = screen.getByLabelText(/BVid/i);
    await user.type(input, 'https://space.bilibili.com/5109111/lists/6995126?type=season{enter}');

    await waitFor(() => {
      expect(mocks.getBiliColleList).toHaveBeenCalledWith('5109111', '6995126');
      expect(handleSeach).toHaveBeenCalledTimes(1);
    });

    expect(handleSeach.mock.calls[0][0]).toMatchObject({
      info: { source: { type: 'collection', mid: '5109111', sid: '6995126' } },
    });
    expect(mocks.getFavList).not.toHaveBeenCalled();
  });

  it('does not fall back to favorite lookup for unrecognized non-numeric input', async () => {
    const user = userEvent.setup();
    const handleSeach = vi.fn();

    render(<Search handleSeach={handleSeach} />);

    const input = screen.getByLabelText(/BVid/i);
    await user.type(input, 'https://space.bilibili.com/444180997/lists/828030{enter}');

    await waitFor(() => {
      expect(handleSeach).toHaveBeenCalledTimes(1);
    });

    expect(mocks.getFavList).not.toHaveBeenCalled();
    expect(handleSeach.mock.calls[0][0]).toMatchObject({
      info: { title: expect.stringContaining('无法识别') },
      songList: [],
    });
  });
});
