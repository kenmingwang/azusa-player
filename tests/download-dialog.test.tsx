/** @vitest-environment jsdom */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const describeDownloadDirectory = vi.hoisted(() => vi.fn());
const pickDownloadDirectory = vi.hoisted(() => vi.fn());
const verifyDirectoryPermission = vi.hoisted(() => vi.fn());
const clearStoredDownloadDirectory = vi.hoisted(() => vi.fn());
const isDirectoryPickerSupported = vi.hoisted(() => vi.fn(() => true));

vi.mock('../src/utils/fileSystemAccess', () => ({
  isDirectoryPickerSupported,
  describeDownloadDirectory,
  pickDownloadDirectory,
  verifyDirectoryPermission,
  clearStoredDownloadDirectory,
}));

// eslint-disable-next-line import/first
import DownloadDialog from '../src/components/DownloadDialog';
// eslint-disable-next-line import/first
import { appendDownloadRecord, resetDownloadHistoryCache } from '../src/utils/downloadHistory';

const renderDialog = (open = true) => render(<DownloadDialog open={open} onClose={vi.fn()} />);

describe('DownloadDialog', () => {
  beforeEach(() => {
    resetDownloadHistoryCache();
    window.localStorage.clear();
    describeDownloadDirectory.mockReset();
    describeDownloadDirectory.mockResolvedValue({ handle: undefined, permission: 'none', name: '' });
    pickDownloadDirectory.mockReset();
    pickDownloadDirectory.mockResolvedValue(undefined);
    verifyDirectoryPermission.mockReset();
    verifyDirectoryPermission.mockResolvedValue(true);
    clearStoredDownloadDirectory.mockReset();
    isDirectoryPickerSupported.mockReturnValue(true);
    delete (window as any).chrome;
  });

  it('offers the folder picker and explains where files go by default', async () => {
    renderDialog();

    expect(await screen.findByTestId('download-location')).toHaveTextContent('保存到浏览器下载目录 · 子目录 azusa-player/');
    expect(screen.getByTestId('pick-download-directory')).toHaveTextContent('选择文件夹');
    expect(screen.getByTestId('download-history-empty')).toHaveTextContent('还没有下载记录');
  });

  it('hides the folder picker when the browser does not support it', async () => {
    isDirectoryPickerSupported.mockReturnValue(false);
    renderDialog();

    await screen.findByTestId('download-location');
    expect(screen.queryByTestId('pick-download-directory')).not.toBeInTheDocument();
  });

  it('shows the picked folder and lets the user switch back to the default', async () => {
    const user = userEvent.setup();
    describeDownloadDirectory.mockResolvedValue({ handle: { name: '我的音乐' }, permission: 'granted', name: '我的音乐' });
    renderDialog();

    expect(await screen.findByTestId('download-location')).toHaveTextContent('直接保存到所选文件夹：我的音乐');
    expect(screen.getByTestId('pick-download-directory')).toHaveTextContent('更换文件夹');

    await user.click(screen.getByTestId('clear-download-directory'));
    expect(clearStoredDownloadDirectory).toHaveBeenCalled();
  });

  it('asks for a fresh grant when the handle was downgraded', async () => {
    const user = userEvent.setup();
    describeDownloadDirectory.mockResolvedValue({ handle: { name: '我的音乐' }, permission: 'prompt', name: '我的音乐' });
    renderDialog();

    const grantButton = await screen.findByTestId('grant-download-directory');
    expect(grantButton).toHaveTextContent('重新授权');

    await user.click(grantButton);
    await waitFor(() => expect(verifyDirectoryPermission).toHaveBeenCalledWith({ name: '我的音乐' }, true));
  });

  it('stores the picked directory through the file system access helper', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(await screen.findByTestId('pick-download-directory'));

    await waitFor(() => expect(pickDownloadDirectory).toHaveBeenCalledTimes(1));
  });

  it('lists the download history with quality and status', async () => {
    await appendDownloadRecord({
      id: 'dl-1',
      songId: 'cid-1',
      bvid: 'BV_1',
      name: '夜に駆ける',
      qualityId: 30280,
      qualityLabel: '192K',
      extension: 'm4a',
      fileName: '夜に駆ける.m4a',
      target: 'browser',
      location: 'C:\\Users\\me\\Downloads\\azusa-player\\夜に駆ける.m4a',
      status: 'done',
      size: 9_596_869,
      downloadId: 7,
      startedAt: 1,
      finishedAt: 1,
    });

    renderDialog();

    const row = await screen.findByTestId('download-record');
    expect(row).toHaveTextContent('夜に駆ける');
    expect(row).toHaveTextContent('192K');
    expect(row).toHaveTextContent('已保存');
    expect(row).toHaveTextContent('9.2 MB');
  });

  it('surfaces the failure reason of a failed record', async () => {
    await appendDownloadRecord({
      id: 'dl-2',
      songId: 'cid-2',
      name: 'Broken Song',
      fileName: '',
      target: 'none',
      status: 'failed',
      error: '音频请求失败 (HTTP 403)',
      startedAt: 1,
      finishedAt: 1,
    });

    renderDialog();

    const row = await screen.findByTestId('download-record');
    expect(row).toHaveTextContent('失败');
    expect(row).toHaveTextContent('音频请求失败 (HTTP 403)');
  });

  it('clears the history on demand', async () => {
    const user = userEvent.setup();
    await appendDownloadRecord({
      id: 'dl-3',
      songId: 'cid-3',
      name: 'Some Song',
      fileName: 'Some Song.m4a',
      target: 'blob',
      status: 'done',
      startedAt: 1,
      finishedAt: 1,
    });

    renderDialog();
    expect(await screen.findByTestId('download-record')).toBeInTheDocument();

    await user.click(screen.getByTestId('clear-download-history'));

    expect(await screen.findByTestId('download-history-empty')).toBeInTheDocument();
  });

  it('opens the browser download folder through chrome.downloads', async () => {
    const user = userEvent.setup();
    const showDefaultFolder = vi.fn();
    const show = vi.fn();
    (window as any).chrome = { downloads: { download: vi.fn(), showDefaultFolder, show } };

    await appendDownloadRecord({
      id: 'dl-4',
      songId: 'cid-4',
      name: 'Row Song',
      fileName: 'Row Song.m4a',
      target: 'browser',
      status: 'done',
      downloadId: 11,
      startedAt: 1,
      finishedAt: 1,
    });

    renderDialog();

    await user.click(await screen.findByTestId('open-download-folder'));
    expect(showDefaultFolder).toHaveBeenCalled();

    await user.click(await screen.findByTestId('show-download-record'));
    expect(show).toHaveBeenCalledWith(11);
  });
});
