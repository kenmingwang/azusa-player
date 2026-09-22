import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const saveAs = vi.hoisted(() => vi.fn());
vi.mock('file-saver', () => ({ saveAs }));

const requestAudioQuality = vi.hoisted(() => vi.fn());
vi.mock('../src/utils/audioQuality', () => ({ requestAudioQuality }));

import {
  buildAudioFileName,
  downloadSongToLocal,
  downloadSongsToLocal,
  resolveExtension,
  sanitizeFileName,
} from '../src/utils/downloader';

const qualityFixture = (overrides: Record<string, any> = {}) => ({
  qualityId: 30280,
  label: '192K',
  title: '192K AAC',
  codecs: 'mp4a.40.2',
  bandwidth: 319101,
  mimeType: 'audio/mp4',
  extension: 'm4a',
  url: 'https://example.com/audio.m4s',
  fetchedAt: Date.now(),
  ...overrides,
});

const blobResponse = (type: string, bytes = 'audio-bytes') => ({
  ok: true,
  status: 200,
  blob: vi.fn().mockResolvedValue(new Blob([bytes], { type })),
});

const song = (overrides: Record<string, any> = {}) => ({
  id: 'cid-1',
  bvid: 'BV_1',
  name: '夜に駆ける',
  singer: '阿梓',
  ...overrides,
});

describe('local audio downloader', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    saveAs.mockReset();
    requestAudioQuality.mockReset();
    requestAudioQuality.mockResolvedValue(qualityFixture());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('file naming helpers', () => {
    it('sanitizes illegal characters and falls back to a default name', () => {
      expect(sanitizeFileName('a/b\\c:d*e?f"g<h>i|j')).toBe('a_b_c_d_e_f_g_h_i_j');
      expect(sanitizeFileName('   ')).toBe('audio');
      expect(sanitizeFileName(undefined)).toBe('audio');
      expect(sanitizeFileName('..hidden')).toBe('hidden');
    });

    it('maps container types to extensions', () => {
      expect(resolveExtension('audio/mp4')).toBe('m4a');
      expect(resolveExtension('audio/flac')).toBe('flac');
      expect(resolveExtension('audio/eac3')).toBe('eac3');
      expect(resolveExtension('audio/mpeg')).toBe('mp3');
      expect(resolveExtension('application/octet-stream', 'flac')).toBe('flac');
      expect(resolveExtension(undefined)).toBe('m4a');
    });

    it('builds a file name from the song name', () => {
      expect(buildAudioFileName({ id: 'c1', name: '夜に駆ける', bvid: 'BV_1' }, 'flac')).toBe('夜に駆ける.flac');
      expect(buildAudioFileName({ id: 'c1', bvid: 'BV_1' }, 'm4a')).toBe('c1.m4a');
    });
  });

  describe('downloadSongToLocal', () => {
    it('downloads the best quality stream and keeps the resolved container', async () => {
      const fetchMock = vi.fn().mockResolvedValue(blobResponse('application/octet-stream'));
      vi.stubGlobal('fetch', fetchMock);

      const result = await downloadSongToLocal(song());

      expect(requestAudioQuality).toHaveBeenCalledWith('BV_1', 'cid-1');
      expect(fetchMock).toHaveBeenCalledWith('https://example.com/audio.m4s');
      expect(saveAs).toHaveBeenCalledTimes(1);
      expect(saveAs.mock.calls[0][1]).toBe('夜に駆ける.m4a');
      expect(result.quality.label).toBe('192K');
      expect(result.fileName).toBe('夜に駆ける.m4a');
    });

    it('uses the hi-res extension when the server reports content-type', async () => {
      requestAudioQuality.mockResolvedValue(qualityFixture({ qualityId: 30251, label: '无损', extension: 'flac' }));
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(blobResponse('audio/flac')));

      await downloadSongToLocal(song());

      expect(saveAs.mock.calls[0][1]).toBe('夜に駆ける.flac');
    });

    it('rejects songs without bvid / cid', async () => {
      await expect(downloadSongToLocal({ id: '', bvid: '', name: 'x' })).rejects.toThrow('缺少 bvid / cid');
      expect(saveAs).not.toHaveBeenCalled();
    });

    it('rejects when the quality can not be resolved', async () => {
      requestAudioQuality.mockResolvedValue(undefined);
      vi.stubGlobal('fetch', vi.fn());

      await expect(downloadSongToLocal(song())).rejects.toThrow('无法解析该分 P 的音频地址');
    });

    it('rejects on an unsuccessful audio response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }));

      await expect(downloadSongToLocal(song())).rejects.toThrow('HTTP 403');
    });
  });

  describe('downloadSongsToLocal', () => {
    it('downloads every song sequentially and reports progress', async () => {
      const fetchMock = vi.fn().mockImplementation(async () => blobResponse('audio/mp4'));
      vi.stubGlobal('fetch', fetchMock);

      const events: any[] = [];
      const summary = await downloadSongsToLocal(
        [song({ id: 'c1', name: 's1' }), song({ id: 'c2', name: 's2' }), song({ id: 'c3', name: 's3' })],
        { onProgress: (event) => events.push(event), delayMs: 0 },
      );

      expect(summary).toMatchObject({ total: 3, succeeded: 3, failed: 0, skipped: 0 });
      expect(saveAs).toHaveBeenCalledTimes(3);
      expect(events.filter((event) => event.status === 'done')).toHaveLength(3);
      expect(events[0]).toMatchObject({ index: 0, total: 3, status: 'downloading' });
      expect(events[events.length - 1]).toMatchObject({ index: 2, total: 3, status: 'done' });
    });

    it('keeps going after a failure and reports it in the summary', async () => {
      vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('fail')) return { ok: false, status: 500 };
        return blobResponse('audio/mp4');
      }));
      requestAudioQuality.mockImplementation(async (_bvid: string, cid: string) =>
        qualityFixture({ url: cid === 'c2' ? 'https://example.com/fail' : 'https://example.com/ok' }),
      );

      const summary = await downloadSongsToLocal([song({ id: 'c1' }), song({ id: 'c2' }), song({ id: 'c3' })], {
        delayMs: 0,
      });

      expect(summary).toMatchObject({ total: 3, succeeded: 2, failed: 1 });
      expect(summary.failures[0]).toMatchObject({ error: '音频请求失败 (HTTP 500)' });
      expect(saveAs).toHaveBeenCalledTimes(2);
    });

    it('stops downloading the remaining songs when cancelled', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(blobResponse('audio/mp4')));

      let cancelled = false;
      const summary = await downloadSongsToLocal([song({ id: 'c1' }), song({ id: 'c2' }), song({ id: 'c3' })], {
        delayMs: 0,
        isCancelled: () => cancelled,
        onProgress: (event) => {
          if (event.status === 'done') cancelled = true;
        },
      });

      expect(summary).toMatchObject({ total: 3, succeeded: 1, skipped: 2 });
      expect(saveAs).toHaveBeenCalledTimes(1);
    });
  });
});
