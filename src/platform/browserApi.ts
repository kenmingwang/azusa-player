type StorageKeys = string | string[] | Record<string, unknown> | null;
type StorageItems = Record<string, unknown>;
type StorageCallback = (items: StorageItems) => void;
type VoidCallback = () => void;
type MessageListener = (message: any, sender?: any, sendResponse?: (response?: any) => void) => void;

const STORAGE_PREFIX = 'azusa-player';

const hasChromeApi = () => typeof chrome !== 'undefined';
const hasExtensionRuntimeApi = () => hasChromeApi() && !!chrome.runtime?.sendMessage;

const resolveApi = () => {
  if (!hasChromeApi()) return webChromeLike as typeof chrome;

  return {
    ...webChromeLike,
    ...chrome,
    storage: {
      ...webChromeLike.storage,
      ...chrome.storage,
      local: chrome.storage?.local || webChromeLike.storage.local,
      sync: chrome.storage?.sync || webChromeLike.storage.sync,
    },
    runtime: {
      ...webChromeLike.runtime,
      ...chrome.runtime,
      onMessage: chrome.runtime?.onMessage || webChromeLike.runtime.onMessage,
    },
  } as typeof chrome;
};

const schedule = (callback?: () => void) => {
  if (!callback) return;
  queueMicrotask(callback);
};

const readBucket = (bucket: string): StorageItems => {
  if (typeof window === 'undefined' || !window.localStorage) return {};

  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}:${bucket}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const writeBucket = (bucket: string, items: StorageItems) => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.setItem(`${STORAGE_PREFIX}:${bucket}`, JSON.stringify(items));
};

const normalizeGetResult = (items: StorageItems, keys: StorageKeys): StorageItems => {
  if (keys == null) return { ...items };

  if (typeof keys === 'string') {
    return keys in items ? { [keys]: items[keys] } : {};
  }

  if (Array.isArray(keys)) {
    return keys.reduce<StorageItems>((acc, key) => {
      if (key in items) acc[key] = items[key];
      return acc;
    }, {});
  }

  return Object.entries(keys).reduce<StorageItems>((acc, [key, defaultValue]) => {
    acc[key] = key in items ? items[key] : defaultValue;
    return acc;
  }, {});
};

const createWebStorageArea = (bucket: string) => ({
  get(keys: StorageKeys, callback: StorageCallback) {
    schedule(() => callback(normalizeGetResult(readBucket(bucket), keys)));
  },
  set(items: StorageItems, callback?: VoidCallback) {
    writeBucket(bucket, { ...readBucket(bucket), ...items });
    schedule(callback);
  },
  remove(keys: string | string[], callback?: VoidCallback) {
    const next = { ...readBucket(bucket) };
    const keyList = Array.isArray(keys) ? keys : [keys];
    keyList.forEach((key) => {
      delete next[key];
    });
    writeBucket(bucket, next);
    schedule(callback);
  },
  clear(callback?: VoidCallback) {
    writeBucket(bucket, {});
    schedule(callback);
  },
});

const runtimeListeners = new Set<MessageListener>();

const webChromeLike = {
  storage: {
    local: createWebStorageArea('local'),
    sync: createWebStorageArea('sync'),
  },
  runtime: {
    lastError: undefined as { message: string } | undefined,
    sendMessage(message: any, callback?: VoidCallback) {
      schedule(() => {
        runtimeListeners.forEach((listener) => listener(message, undefined, () => undefined));
        callback?.();
      });
    },
    onMessage: {
      addListener(listener: MessageListener) {
        runtimeListeners.add(listener);
      },
      removeListener(listener: MessageListener) {
        runtimeListeners.delete(listener);
      },
    },
    openOptionsPage() {
      if (typeof window !== 'undefined') {
        window.location.assign('/');
      }
    },
  },
};

export const browserApi = new Proxy(webChromeLike as typeof chrome, {
  get(_target, prop, receiver) {
    return Reflect.get(resolveApi(), prop, receiver);
  },
}) as typeof chrome;

export const isExtensionRuntime = () => hasExtensionRuntimeApi();
