import { fetchBestAudio } from './Data';
import { browserApi } from '../platform/browserApi';

export interface AudioQualityInfo {
  qualityId: number;
  label: string;
  title: string;
  codecs: string;
  bandwidth: number;
  mimeType: string;
  extension: string;
  url: string;
  fetchedAt: number;
}

interface QualityEntry {
  info?: AudioQualityInfo;
  at: number;
}

const CACHE_STORAGE_KEY = 'AudioQualityCache';
// A play url stays valid for a while; reuse it instead of hammering the playurl endpoint.
const URL_REUSE_WINDOW_MS = 10 * 60 * 1000;
// Failed probes are retried after a short cool-down so a transient failure is not sticky.
const FAILURE_RETRY_WINDOW_MS = 5 * 60 * 1000;
const MAX_CONCURRENT_PROBES = 3;
const MAX_PERSISTED_ENTRIES = 800;
const PERSIST_DEBOUNCE_MS = 1200;

const memoryCache = new Map<string, QualityEntry>();
const pendingProbes = new Map<string, Promise<AudioQualityInfo | undefined>>();
const subscribers = new Set<(key: string, info?: AudioQualityInfo) => void>();
const queue: Array<() => void> = [];

let activeProbes = 0;
let hydrated = false;
let hydratePromise: Promise<void> | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

export const audioQualityKey = (bvid?: string, cid?: string) => (bvid && cid ? `${bvid}:${cid}` : '');

export const subscribeAudioQuality = (listener: (key: string, info?: AudioQualityInfo) => void) => {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
};

const notify = (key: string, info?: AudioQualityInfo) => {
  subscribers.forEach((listener) => {
    try {
      listener(key, info);
    } catch (error) {
      console.warn('[azusa-player][quality] subscriber failed', error);
    }
  });
};

const persist = () => {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    const entries = Array.from(memoryCache.entries())
      .filter(([, entry]) => entry.info)
      .sort((a, b) => b[1].at - a[1].at)
      .slice(0, MAX_PERSISTED_ENTRIES);

    const payload: Record<string, QualityEntry> = {};
    entries.forEach(([key, entry]) => {
      payload[key] = entry;
    });

    try {
      browserApi.storage.local.set({ [CACHE_STORAGE_KEY]: payload });
    } catch (error) {
      console.warn('[azusa-player][quality] cache persist failed', error);
    }
  }, PERSIST_DEBOUNCE_MS);
};

export const hydrateQualityCache = async (): Promise<void> => {
  if (hydrated) return;
  if (hydratePromise) return hydratePromise;

  hydratePromise = new Promise<void>((resolve) => {
    try {
      browserApi.storage.local.get([CACHE_STORAGE_KEY], (result) => {
        const stored = result?.[CACHE_STORAGE_KEY] as Record<string, QualityEntry> | undefined;
        if (stored && typeof stored === 'object') {
          Object.entries(stored).forEach(([key, entry]) => {
            if (!entry?.info) return;
            memoryCache.set(key, { info: entry.info, at: Number(entry.at) || 0 });
          });
        }
        hydrated = true;
        resolve();
      });
    } catch (error) {
      console.warn('[azusa-player][quality] cache hydrate failed', error);
      hydrated = true;
      resolve();
    }
  });

  return hydratePromise;
};

export const getCachedAudioQuality = (bvid?: string, cid?: string): AudioQualityInfo | undefined => {
  const key = audioQualityKey(bvid, cid);
  if (!key) return undefined;
  return memoryCache.get(key)?.info;
};

const runNextProbe = () => {
  if (activeProbes >= MAX_CONCURRENT_PROBES) return;
  const task = queue.shift();
  if (!task) return;
  activeProbes += 1;
  task();
};

const enqueueProbe = (task: () => void) => {
  queue.push(task);
  runNextProbe();
};

/**
 * Resolves the audio quality of a page. Results are memoised (memory + extension storage) and
 * probes are queued so that rendering a long playlist does not fire a request per row at once.
 */
export const requestAudioQuality = async (bvid?: string, cid?: string): Promise<AudioQualityInfo | undefined> => {
  const key = audioQualityKey(bvid, cid);
  if (!key) return undefined;

  await hydrateQualityCache();

  const cached = memoryCache.get(key);
  if (cached) {
    const window = cached.info ? URL_REUSE_WINDOW_MS : FAILURE_RETRY_WINDOW_MS;
    if (Date.now() - cached.at < window) return cached.info;
  }

  const inflight = pendingProbes.get(key);
  if (inflight) return inflight;

  const probe = new Promise<AudioQualityInfo | undefined>((resolve) => {
    enqueueProbe(() => {
      fetchBestAudio(bvid, cid)
        .then((info) => {
          const normalized = (info || undefined) as AudioQualityInfo | undefined;
          memoryCache.set(key, { info: normalized, at: Date.now() });
          persist();
          notify(key, normalized);
          resolve(normalized);
        })
        .catch(() => {
          memoryCache.set(key, { at: Date.now() });
          resolve(undefined);
        })
        .finally(() => {
          pendingProbes.delete(key);
          activeProbes -= 1;
          runNextProbe();
        });
    });
  });

  pendingProbes.set(key, probe);
  return probe;
};

/** Test/maintenance helper: drops every memoised quality. */
export const resetAudioQualityCache = () => {
  memoryCache.clear();
  pendingProbes.clear();
  queue.length = 0;
  activeProbes = 0;
  hydrated = false;
  hydratePromise = null;
};
