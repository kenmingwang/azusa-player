import { saveAs } from 'file-saver';
import { requestAudioQuality, type AudioQualityInfo } from './audioQuality';

export interface DownloadableSong {
  id: string;
  bvid?: string;
  name?: string;
  singer?: string;
}

export type DownloadStatus = 'pending' | 'downloading' | 'done' | 'failed' | 'skipped';

export interface DownloadProgressEvent {
  index: number;
  total: number;
  song: DownloadableSong;
  status: DownloadStatus;
  quality?: AudioQualityInfo;
  fileName?: string;
  error?: string;
}

export interface DownloadSummary {
  total: number;
  succeeded: number;
  failed: number;
  skipped: number;
  failures: Array<{ song: DownloadableSong; error: string }>;
}

interface DownloadOptions {
  onProgress?: (event: DownloadProgressEvent) => void;
  isCancelled?: () => boolean;
  /** Small pause between files so Chrome can enqueue them one by one. */
  delayMs?: number;
}

const DEFAULT_DELAY_MS = 400;
const EXTENSION_BY_MIME: Record<string, string> = {
  'audio/mp4': 'm4a',
  'audio/m4a': 'm4a',
  'audio/aac': 'm4a',
  'audio/flac': 'flac',
  'audio/x-flac': 'flac',
  'audio/eac3': 'eac3',
  'audio/ec-3': 'eac3',
  'audio/mpeg': 'mp3',
};

export const sanitizeFileName = (name?: string) => {
  const cleaned = String(name || '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f<>:"/\\|?*]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '');

  const limited = cleaned.slice(0, 120).trim();
  return limited || 'audio';
};

export const resolveExtension = (mimeType: string | undefined, fallback = 'm4a') => {
  const normalized = String(mimeType || '')
    .split(';')[0]
    .trim()
    .toLowerCase();
  return EXTENSION_BY_MIME[normalized] || fallback;
};

export const buildAudioFileName = (song: DownloadableSong, extension = 'm4a') =>
  `${sanitizeFileName(song?.name || song?.id)}.${extension}`;

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Resolves the best quality stream of a page and saves the audio to the local disk.
 * Returns the resolved quality so callers can surface it in the UI.
 */
export const downloadSongToLocal = async (
  song: DownloadableSong,
): Promise<{ quality: AudioQualityInfo; fileName: string; size: number }> => {
  if (!song?.bvid || !song?.id) {
    throw new Error('缺少 bvid / cid，无法下载');
  }

  const quality = await requestAudioQuality(song.bvid, song.id);
  if (!quality?.url) {
    throw new Error('无法解析该分 P 的音频地址');
  }

  const response = await fetch(quality.url);
  if (!response.ok) {
    throw new Error(`音频请求失败 (HTTP ${response.status})`);
  }

  const blob = await response.blob();
  if (!blob.size) {
    throw new Error('音频内容为空');
  }

  const extension = resolveExtension(blob.type, quality.extension);
  const fileName = buildAudioFileName(song, extension);
  saveAs(blob, fileName);

  return { quality, fileName, size: blob.size };
};

/** Batch download: runs sequentially so large playlists stay memory friendly. */
export const downloadSongsToLocal = async (
  songs: DownloadableSong[],
  { onProgress, isCancelled, delayMs = DEFAULT_DELAY_MS }: DownloadOptions = {},
): Promise<DownloadSummary> => {
  const list = (songs || []).filter(Boolean);
  const summary: DownloadSummary = { total: list.length, succeeded: 0, failed: 0, skipped: 0, failures: [] };

  for (let index = 0; index < list.length; index += 1) {
    const song = list[index];

    if (isCancelled?.()) {
      summary.skipped += 1;
      onProgress?.({ index, total: list.length, song, status: 'skipped' });
      continue;
    }

    onProgress?.({ index, total: list.length, song, status: 'downloading' });

    try {
      const { quality, fileName } = await downloadSongToLocal(song);
      summary.succeeded += 1;
      onProgress?.({ index, total: list.length, song, status: 'done', quality, fileName });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      summary.failed += 1;
      summary.failures.push({ song, error: message });
      onProgress?.({ index, total: list.length, song, status: 'failed', error: message });
    }

    if (index < list.length - 1 && delayMs > 0) {
      await wait(delayMs);
    }
  }

  return summary;
};
