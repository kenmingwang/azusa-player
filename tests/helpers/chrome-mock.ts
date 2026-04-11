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
  const onMessageListeners = new Set<(...args: any[]) => void>();
  const onContextMenuClickListeners = new Set<(...args: any[]) => void>();
  const onContextMenuShownListeners = new Set<(...args: any[]) => void>();
  const onContextMenuHiddenListeners = new Set<(...args: any[]) => void>();

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

  const chromeMock = {
    storage: { local, sync },
    runtime: {
      lastError: null,
      sendMessage: vi.fn((_message: any, callback?: () => void) => {
        callback?.();
      }),
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
    contextMenus: {
      create: vi.fn((_props: any, callback?: () => void) => {
        callback?.();
      }),
      update: vi.fn((_menuId: string, _props: any, callback?: () => void) => {
        callback?.();
      }),
      removeAll: vi.fn((callback?: () => void) => {
        callback?.();
      }),
      refresh: vi.fn(),
      onClicked: {
        addListener: vi.fn((fn: (...args: any[]) => void) => {
          onContextMenuClickListeners.add(fn);
        }),
      },
      onShown: {
        addListener: vi.fn((fn: (...args: any[]) => void) => {
          onContextMenuShownListeners.add(fn);
        }),
      },
      onHidden: {
        addListener: vi.fn((fn: (...args: any[]) => void) => {
          onContextMenuHiddenListeners.add(fn);
        }),
      },
    },
    notifications: {
      create: vi.fn((_options: any, callback?: (notificationId: string) => void) => {
        callback?.('notification-1');
      }),
    },
    scripting: {
      executeScript: vi.fn().mockResolvedValue([{ result: [] }]),
    },
  };

  return {
    chromeMock,
    localStore,
    syncStore,
    emitRuntimeMessage: (payload: any, sender: any = {}) => {
      onMessageListeners.forEach((fn) => fn(payload, sender, () => undefined));
    },
    emitContextMenuClick: (info: any, tab?: any) => {
      onContextMenuClickListeners.forEach((fn) => fn(info, tab));
    },
    emitContextMenuShown: (info: any, tab?: any) => {
      onContextMenuShownListeners.forEach((fn) => fn(info, tab));
    },
    emitContextMenuHidden: () => {
      onContextMenuHiddenListeners.forEach((fn) => fn());
    },
  };
};
