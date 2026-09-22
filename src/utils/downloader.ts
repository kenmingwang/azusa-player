import { saveAs } from 'file-saver';
import { requestAudioQuality, type AudioQualityInfo } from './audioQuality';
import { verifyDirectoryPermission, writeBlobToDirectory } from './fileSystemAccess';
import { appendDownloadRecord, createDownloadRecordId, type DownloadRecord } from './downloadHistory';

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
  /** Where the files should land: a user-picked directory, else the browser download folder. */
  target?: DownloadTarget;
  /** Records are written to the download history by default. */
  recordHistory?: boolean;
}

export interface DownloadTarget {
  directoryHandle?: FileSystemDirectoryHandle | null;
  /** Subfolder inside the browser download directory. */
  subfolder?: string;
}

export interface DownloadOutcome {
  quality: AudioQualityInfo;
  fileName: string;
  size: number;
  target: 'directory' | 'browser' | 'blob';
  location?: string;
  downloadId?: number;
}

const DEFAULT_DELAY_MS = 400;
const BROWSER_DOWNLOAD_SUBFOLDER = 'azusa-player';
const DOWNLOAD_STATE_TIMEOUT_MS = 20000;
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

/** `chrome.downloads` only exists when the "downloads" permission is granted (extension context). */
const getDownloadsApi = (): typeof chrome.downloads | undefined => {
  const api = (globalThis as any)?.chrome?.downloads;
  return api && typeof api.download === 'function' ? (api as typeof chrome.downloads) : undefined;
};

export const isBrowserDownloadSupported = () => !!getDownloadsApi();

const waitForBrowserDownload = async (downloadId: number, timeoutMs = DOWNLOAD_STATE_TIMEOUT_MS) => {
  const downloads = getDownloadsApi();
  if (!downloads || typeof downloads.search !== 'function') return undefined;

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await wait(250);
    const [item] = await downloads.search({ id: downloadId });
    if (item && item.state !== 'in_progress') return item;
  }
  return undefined;
};

interface SavedBlob {
  target: 'directory' | 'browser' | 'blob';
  fileName: string;
  size?: number;
  location?: string;
  downloadId?: number;
}

/**
 * Writes the bytes to the user-picked directory when one is granted (no dialog at all), otherwise
 * hands a blob URL to chrome.downloads so the file lands in the browser download folder silently.
 */
const saveBlob = async (blob: Blob, fileName: string, target?: DownloadTarget): Promise<SavedBlob> => {
  const directoryHandle = target?.directoryHandle;
  if (directoryHandle && (await verifyDirectoryPermission(directoryHandle, false))) {
    const location = await writeBlobToDirectory(directoryHandle, fileName, blob);
    return { target: 'directory', location, fileName: location.split('/').pop() || fileName, size: blob.size };
  }

  const downloads = getDownloadsApi();
  if (downloads) {
    const blobUrl = URL.createObjectURL(blob);
    try {
      const subfolder = target?.subfolder?.trim().replace(/^[/\\]+|[/\\]+$/g, '');
      const downloadId = await downloads.download({
        url: blobUrl,
        filename: subfolder ? `${subfolder}/${fileName}` : fileName,
        conflictAction: 'uniquify',
        saveAs: false,
      });
      const item = await waitForBrowserDownload(downloadId);
      const persistedName = item?.filename ? item.filename.split(/[\\/]/).pop() || fileName : fileName;
      return {
        target: 'browser',
        downloadId,
        fileName: persistedName,
        size: item?.fileSize,
        location: item?.filename,
      };
    } catch (error) {
      console.warn('[azusa-player][downloads] chrome.downloads failed, falling back to blob save', error);
    } finally {
      // The download keeps reading the blob after the promise resolves; revoke well after it settled.
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    }
  }

  saveAs(blob, fileName);
  return { target: 'blob', fileName, size: blob.size };
};

/**
 * Resolves the best quality stream of a page and saves the audio to the local disk.
 * Returns the resolved quality so callers can surface it in the UI.
 */
export const downloadSongToLocal = async (
  song: DownloadableSong,
  target?: DownloadTarget,
): Promise<DownloadOutcome> => {
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
  const saved = await saveBlob(blob, fileName, target);

  return {
    quality,
    fileName: saved.fileName,
    size: saved.size ?? blob.size,
    target: saved.target,
    location: saved.location,
    downloadId: saved.downloadId,
  };
};

/** Batch download: runs sequentially so large playlists stay memory friendly. */
export const downloadSongsToLocal = async (
  songs: DownloadableSong[],
  {
    onProgress,
    isCancelled,
    delayMs = DEFAULT_DELAY_MS,
    target,
    recordHistory = true,
  }: DownloadOptions = {},
): Promise<DownloadSummary> => {
  const list = (songs || []).filter(Boolean);
  const summary: DownloadSummary = { total: list.length, succeeded: 0, failed: 0, skipped: 0, failures: [] };

  const record = async (song: DownloadableSong, patch: Partial<DownloadRecord>) => {
    if (!recordHistory) return;
    const now = Date.now();
    await appendDownloadRecord({
      id: createDownloadRecordId(),
      songId: song?.id || '',
      bvid: song?.bvid,
      name: song?.name || song?.id || '',
      singer: (song as any)?.singer,
      fileName: '',
      target: 'none',
      status: 'failed',
      startedAt: now,
      finishedAt: now,
      ...patch,
    } as DownloadRecord);
  };

  for (let index = 0; index < list.length; index += 1) {
    const song = list[index];

    if (isCancelled?.()) {
      summary.skipped += 1;
      onProgress?.({ index, total: list.length, song, status: 'skipped' });
      await record(song, { status: 'cancelled' });
      continue;
    }

    onProgress?.({ index, total: list.length, song, status: 'downloading' });
    const startedAt = Date.now();

    try {
      const outcome = await downloadSongToLocal(song, target);
      summary.succeeded += 1;
      onProgress?.({ index, total: list.length, song, status: 'done', quality: outcome.quality, fileName: outcome.fileName });
      await record(song, {
        status: 'done',
        startedAt,
        finishedAt: Date.now(),
        fileName: outcome.fileName,
        qualityId: outcome.quality?.qualityId,
        qualityLabel: outcome.quality?.label,
        extension: outcome.quality?.extension,
        target: outcome.target,
        location: outcome.location,
        size: outcome.size,
        downloadId: outcome.downloadId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      summary.failed += 1;
      summary.failures.push({ song, error: message });
      onProgress?.({ index, total: list.length, song, status: 'failed', error: message });
      await record(song, { status: 'failed', startedAt, finishedAt: Date.now(), error: message });
    }

    if (index < list.length - 1 && delayMs > 0) {
      await wait(delayMs);
    }
  }

  return summary;
};
