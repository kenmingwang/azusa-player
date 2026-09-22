import { browserApi } from '../platform/browserApi';

export type DownloadRecordStatus = 'done' | 'failed' | 'cancelled';

export interface DownloadRecord {
  id: string;
  songId: string;
  bvid?: string;
  name: string;
  singer?: string;
  qualityId?: number;
  qualityLabel?: string;
  extension?: string;
  fileName: string;
  /** Where the bytes ended up: the picked directory, the browser download folder, or a blob save. */
  target: 'directory' | 'browser' | 'blob' | 'none';
  location?: string;
  status: DownloadRecordStatus;
  size?: number;
  downloadId?: number;
  error?: string;
  startedAt: number;
  finishedAt: number;
}

const HISTORY_KEY = 'DownloadHistory';
const MAX_RECORDS = 500;

let cachedHistory: DownloadRecord[] | null = null;
const subscribers = new Set<(records: DownloadRecord[]) => void>();

const notify = (records: DownloadRecord[]) => {
  subscribers.forEach((listener) => {
    try {
      listener(records);
    } catch (error) {
      console.warn('[azusa-player][downloads] history subscriber failed', error);
    }
  });
};

export const subscribeDownloadHistory = (listener: (records: DownloadRecord[]) => void) => {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
};

export const readDownloadHistory = async (): Promise<DownloadRecord[]> => {
  if (cachedHistory) return cachedHistory;

  const records = await new Promise<DownloadRecord[]>((resolve) => {
    try {
      browserApi.storage.local.get([HISTORY_KEY], (result) => {
        const stored = result?.[HISTORY_KEY];
        resolve(Array.isArray(stored) ? (stored as DownloadRecord[]) : []);
      });
    } catch (error) {
      console.warn('[azusa-player][downloads] failed to read history', error);
      resolve([]);
    }
  });

  cachedHistory = records;
  return records;
};

const persist = (records: DownloadRecord[]) => {
  cachedHistory = records;
  try {
    browserApi.storage.local.set({ [HISTORY_KEY]: records });
  } catch (error) {
    console.warn('[azusa-player][downloads] failed to persist history', error);
  }
  notify(records);
};

export const appendDownloadRecord = async (record: DownloadRecord): Promise<DownloadRecord[]> => {
  const records = await readDownloadHistory();
  const next = [record, ...records].slice(0, MAX_RECORDS);
  persist(next);
  return next;
};

export const updateDownloadRecord = async (id: string, patch: Partial<DownloadRecord>): Promise<DownloadRecord[]> => {
  const records = await readDownloadHistory();
  const next = records.map((record) => (record.id === id ? { ...record, ...patch } : record));
  persist(next);
  return next;
};

export const removeDownloadRecord = async (id: string): Promise<DownloadRecord[]> => {
  const records = await readDownloadHistory();
  const next = records.filter((record) => record.id !== id);
  persist(next);
  return next;
};

export const clearDownloadHistory = async (): Promise<DownloadRecord[]> => {
  persist([]);
  return [];
};

let recordCounter = 0;

export const createDownloadRecordId = () =>
  `dl-${Date.now().toString(36)}-${(recordCounter += 1).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const resetDownloadHistoryCache = () => {
  cachedHistory = null;
};
