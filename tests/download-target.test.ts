/**
 * Routing tests for the "where do the bytes land" decision:
 *  1. a granted user-picked directory  -> File System Access, no dialog at all
 *  2. chrome.downloads available       -> silent save into <browser downloads>/azusa-player/
 *  3. neither                          -> file-saver blob save
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const saveAs = vi.hoisted(() => vi.fn());
vi.mock('file-saver', () => ({ saveAs }));

const requestAudioQuality = vi.hoisted(() => vi.fn());
vi.mock('../src/utils/audioQuality', () => ({ requestAudioQuality }));

// eslint-disable-next-line import/first
import { downloadSongToLocal, downloadSongsToLocal, isBrowserDownloadSupported } from '../src/utils/downloader';
// eslint-disable-next-line import/first
import { readDownloadHistory, resetDownloadHistoryCache } from '../src/utils/downloadHistory';

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

const song = () => ({ id: 'cid-1', name: '夜に駆ける', bvid: 'BV_1' });

const buildDirectoryHandle = (permission: 'granted' | 'prompt' = 'granted', existing: string[] = []) => {
  const written: { name: string; size: number }[] = [];
  return {
    name: '我的音乐',
    written,
    queryPermission: vi.fn(async () => permission),
    requestPermission: vi.fn(async () => permission),
    getFileHandle: vi.fn(async (fileName: string, options?: { create?: boolean }) => {
      if (!options?.create && !existing.includes(fileName)) {
        throw new DOMException('File does not exist', 'NotFoundError');
      }
      return {
        createWritable: async () => ({
          write: async (blob: Blob) => {
            written.push({ name: fileName, size: blob.size });
          },
          close: async () => undefined,
        }),
      };
    }),
  };
};

const installChromeDownloads = (searchResult: any[] = [{ state: 'complete', fileSize: 4096, filename: 'C:\\Users\\me\\Downloads\\azusa-player\\夜に駆ける.m4a' }]) => {
  const download = vi.fn(async () => 7);
  const search = vi.fn(async () => searchResult);
  (globalThis as any).chrome = { downloads: { download, search, showDefaultFolder: vi.fn(), show: vi.fn() } };
  return { download, search };
};

describe('download destination routing', () => {
  const originalFetch = globalThis.fetch;
  let createObjectURL: any;
  let revokeObjectURL: any;

  beforeEach(() => {
    globalThis.fetch = vi.fn(async () => ({ ok: true, status: 200, blob: async () => new Blob(['audio-bytes']) })) as any;
    requestAudioQuality.mockReset();
    requestAudioQuality.mockResolvedValue(qualityFixture);
    saveAs.mockReset();
    resetDownloadHistoryCache();
    delete (globalThis as any).chrome;

    createObjectURL = vi.fn(() => 'blob:mock-url');
    revokeObjectURL = vi.fn();
    (URL as any).createObjectURL = createObjectURL;
    (URL as any).revokeObjectURL = revokeObjectURL;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete (globalThis as any).chrome;
  });

  it('writes straight into the picked directory and never opens a dialog', async () => {
    const handle = buildDirectoryHandle('granted');
    const result = await downloadSongToLocal(song(), { directoryHandle: handle as any });

    expect(result.target).toBe('directory');
    expect(result.location).toBe('我的音乐/夜に駆ける.m4a');
    expect(saveAs).not.toHaveBeenCalled();
    expect(handle.written).toEqual([{ name: '夜に駆ける.m4a', size: 11 }]);
  });

  it('keeps existing files and appends a (1) suffix in the picked directory', async () => {
    const handle = buildDirectoryHandle('granted', ['夜に駆ける.m4a']);
    const result = await downloadSongToLocal(song(), { directoryHandle: handle as any });

    expect(result.fileName).toBe('夜に駆ける (1).m4a');
    expect(result.location).toBe('我的音乐/夜に駆ける (1).m4a');
  });

  it('falls back to chrome.downloads when the stored handle needs a fresh grant', async () => {
    const handle = buildDirectoryHandle('prompt');
    const { download } = installChromeDownloads();

    const result = await downloadSongToLocal(song(), { directoryHandle: handle as any, subfolder: 'azusa-player' });

    expect(result.target).toBe('browser');
    expect(handle.written).toEqual([]);
    expect(download).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'blob:mock-url',
        filename: 'azusa-player/夜に駆ける.m4a',
        conflictAction: 'uniquify',
        saveAs: false,
      }),
    );
    expect(result.size).toBe(4096);
    expect(result.downloadId).toBe(7);
    expect(result.fileName).toBe('夜に駆ける.m4a');
  });

  it('saves into the browser download subfolder when chrome.downloads exists', async () => {
    const { download, search } = installChromeDownloads();
    expect(isBrowserDownloadSupported()).toBe(true);

    const result = await downloadSongToLocal(song(), { subfolder: 'azusa-player' });

    expect(result.target).toBe('browser');
    expect(download).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith({ id: 7 });
    expect(saveAs).not.toHaveBeenCalled();
  });

  it('drops subfolder when none is configured', async () => {
    const { download } = installChromeDownloads();
    await downloadSongToLocal(song(), {});

    expect(download.mock.calls[0][0].filename).toBe('夜に駆ける.m4a');
  });

  it('falls back to a blob save when chrome.downloads is missing', async () => {
    const result = await downloadSongToLocal(song(), { subfolder: 'azusa-player' });

    expect(result.target).toBe('blob');
    expect(saveAs).toHaveBeenCalledTimes(1);
  });

  it('falls back to a blob save when chrome.downloads throws', async () => {
    (globalThis as any).chrome = {
      downloads: {
        download: vi.fn(async () => {
          throw new Error('quota exceeded');
        }),
        search: vi.fn(async () => []),
      },
    };

    const result = await downloadSongToLocal(song(), { subfolder: 'azusa-player' });

    expect(result.target).toBe('blob');
    expect(saveAs).toHaveBeenCalledTimes(1);
  });

  it('falls back to a blob save when the download never leaves in_progress', async () => {
    vi.useFakeTimers();
    try {
      installChromeDownloads([{ state: 'in_progress', bytesReceived: 10 }]);
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const promise = downloadSongToLocal(song(), { subfolder: 'azusa-player' });
      await vi.advanceTimersByTimeAsync(21000);
      const result = await promise;

      expect(result.target).toBe('browser');
      // No fileSize reported (still in progress when we gave up) -> the blob size is the fallback.
      expect(result.size).toBe(11);
      expect(result.fileName).toBe('夜に駆ける.m4a');
    } finally {
      vi.useRealTimers();
    }
  });

  it('prefers the granted directory over chrome.downloads', async () => {
    const handle = buildDirectoryHandle('granted');
    const { download } = installChromeDownloads();

    const result = await downloadSongToLocal(song(), { directoryHandle: handle as any, subfolder: 'azusa-player' });

    expect(result.target).toBe('directory');
    expect(download).not.toHaveBeenCalled();
  });

  it('records every attempted song in the download history', async () => {
    installChromeDownloads();

    const summary = await downloadSongsToLocal([song()], { subfolder: 'azusa-player', delayMs: 0 });

    expect(summary).toMatchObject({ total: 1, succeeded: 1 });
    const [record] = await readDownloadHistory();
    expect(record).toMatchObject({
      songId: 'cid-1',
      name: '夜に駆ける',
      status: 'done',
      target: 'browser',
      fileName: '夜に駆ける.m4a',
      qualityId: 30280,
      qualityLabel: '192K',
      extension: 'm4a',
      size: 4096,
      downloadId: 7,
    });
  });

  it('records failures with their error message', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 403 })) as any;

    const summary = await downloadSongsToLocal([song()], { delayMs: 0 });

    expect(summary.failed).toBe(1);
    const [record] = await readDownloadHistory();
    expect(record).toMatchObject({ status: 'failed', error: '音频请求失败 (HTTP 403)', target: 'none' });
  });

  it('skips history writes when recordHistory is false', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: true, status: 200, blob: async () => new Blob(['x']) })) as any;

    await downloadSongsToLocal([song()], { delayMs: 0, recordHistory: false });

    expect(await readDownloadHistory()).toEqual([]);
  });
});
