import { vi } from 'vitest';

type RecordMap = Record<string, any>;

const pickKeys = (store: RecordMap, keys: any) => {
  if (keys == null) return { ...store };
  if (typeof keys === 'string') return { [keys]: store[keys] };
  if (Array.isArray(keys)) {
    return keys.reduce((acc, key) => {
      acc[key] = store[key];
      return acc;
    }, {} as RecordMap);
  }
  if (typeof keys === 'object') {
    const out: RecordMap = {};
    for (const key of Object.keys(keys)) {
      out[key] = store[key] ?? keys[key];
    }
    return out;
  }
  return {};
};

export const createChromeMock = (initialLocal: RecordMap = {}, initialSync: RecordMap = {}) => {
  const localStore: RecordMap = { ...initialLocal };
  const syncStore: RecordMap = { ...initialSync };

  const local = {
    get: vi.fn((keys: any, cb: (result: RecordMap) => void) => cb(pickKeys(localStore, keys))),
    set: vi.fn((items: RecordMap, cb?: () => void) => {
      Object.assign(localStore, items);
      cb?.();
    }),
    remove: vi.fn((keys: string | string[], cb?: () => void) => {
      const arr = Array.isArray(keys) ? keys : [keys];
      arr.forEach((k) => delete localStore[k]);
      cb?.();
    }),
    clear: vi.fn((cb?: () => void) => {
      for (const key of Object.keys(localStore)) delete localStore[key];
      cb?.();
    }),
  };

  const sync = {
    get: vi.fn((keys: any, cb: (result: RecordMap) => void) => cb(pickKeys(syncStore, keys))),
    set: vi.fn((items: RecordMap, cb?: () => void) => {
      Object.assign(syncStore, items);
      cb?.();
    }),
    remove: vi.fn((keys: string | string[], cb?: () => void) => {
      const arr = Array.isArray(keys) ? keys : [keys];
      arr.forEach((k) => delete syncStore[k]);
      cb?.();
    }),
    clear: vi.fn((cb?: () => void) => {
      for (const key of Object.keys(syncStore)) delete syncStore[key];
      cb?.();
    }),
  };

  const onMessageListeners = new Set<(...args: any[]) => void>();

  const chromeMock = {
    storage: { local, sync },
    runtime: {
      lastError: null,
      sendMessage: vi.fn(),
      openOptionsPage: vi.fn(),
      onMessage: {
        addListener: vi.fn((fn: (...args: any[]) => void) => {
          onMessageListeners.add(fn);
        }),
        removeListener: vi.fn((fn: (...args: any[]) => void) => {
          onMessageListeners.delete(fn);
        }),
      },
    },
    action: {
      onClicked: {
        addListener: vi.fn(),
      },
    },
  };

  return {
    chromeMock,
    localStore,
    syncStore,
    emitRuntimeMessage: (payload: any) => {
      onMessageListeners.forEach((fn) => fn(payload, {}, () => undefined));
    },
  };
};
