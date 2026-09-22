/**
 * File System Access helpers.
 *
 * Chrome extensions cannot write to an arbitrary absolute path — the only sanctioned way is the
 * File System Access API: the user picks a directory once (user gesture), and the handle is kept in
 * IndexedDB so later downloads can write straight into it without any file chooser.
 */

const DB_NAME = 'azusa-player-fs';
const DB_VERSION = 1;
const STORE_NAME = 'handles';
const DIRECTORY_KEY = 'downloadDirectory';

const hasIndexedDb = () => typeof indexedDB !== 'undefined';

const openDatabase = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const withStore = async <T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest): Promise<T> => {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const request = run(transaction.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
};

const idbGet = <T>(key: string) => withStore<T | undefined>('readonly', (store) => store.get(key));
const idbPut = (key: string, value: unknown) => withStore<IDBValidKey>('readwrite', (store) => store.put(value, key));
const idbDelete = (key: string) => withStore<undefined>('readwrite', (store) => store.delete(key));

export const isDirectoryPickerSupported = () =>
  typeof window !== 'undefined' && typeof (window as any).showDirectoryPicker === 'function';

/** Must be called from a user gesture. Persists the handle for later silent writes. */
export const pickDownloadDirectory = async (): Promise<FileSystemDirectoryHandle | undefined> => {
  if (!isDirectoryPickerSupported()) return undefined;
  const handle = (await (window as any).showDirectoryPicker({ id: 'azusa-player-downloads', mode: 'readwrite' })) as FileSystemDirectoryHandle;
  await idbPut(DIRECTORY_KEY, handle);
  return handle;
};

export const getStoredDownloadDirectory = async (): Promise<FileSystemDirectoryHandle | undefined> => {
  if (!hasIndexedDb()) return undefined;
  try {
    return (await idbGet<FileSystemDirectoryHandle>(DIRECTORY_KEY)) || undefined;
  } catch (error) {
    console.warn('[azusa-player][fs] failed to read stored directory handle', error);
    return undefined;
  }
};

export const clearStoredDownloadDirectory = async () => {
  if (!hasIndexedDb()) return;
  try {
    await idbDelete(DIRECTORY_KEY);
  } catch (error) {
    console.warn('[azusa-player][fs] failed to clear directory handle', error);
  }
};

type PermissionMode = { mode: 'readwrite' };

/**
 * `queryPermission` / `requestPermission` live in the File System Access spec but are missing from
 * this TS version's lib.dom, so the handle is widened locally.
 */
type PermissionCapableHandle = FileSystemDirectoryHandle & {
  queryPermission?: (options: PermissionMode) => Promise<PermissionState>;
  requestPermission?: (options: PermissionMode) => Promise<PermissionState>;
};

/**
 * Chrome may downgrade a restored handle back to "prompt", in which case we need a fresh user
 * gesture. `request` should only be true while a click is still being handled.
 */
export const verifyDirectoryPermission = async (handle: FileSystemDirectoryHandle, request = false): Promise<boolean> => {
  try {
    const options: PermissionMode = { mode: 'readwrite' };
    const capable = handle as PermissionCapableHandle;
    if (typeof capable.queryPermission !== 'function') return true;
    if ((await capable.queryPermission(options)) === 'granted') return true;
    if (!request) return false;
    return (await capable.requestPermission?.(options)) === 'granted';
  } catch (error) {
    console.warn('[azusa-player][fs] permission check failed', error);
    return false;
  }
};

/** Raw permission state of a stored handle ("prompt" means a fresh user gesture is required). */
export const queryDirectoryPermission = async (
  handle: FileSystemDirectoryHandle,
): Promise<'granted' | 'prompt' | 'denied'> => {
  try {
    const capable = handle as PermissionCapableHandle;
    if (typeof capable.queryPermission !== 'function') return 'granted';
    return (await capable.queryPermission({ mode: 'readwrite' })) as 'granted' | 'prompt' | 'denied';
  } catch (error) {
    console.warn('[azusa-player][fs] queryPermission failed', error);
    return 'denied';
  }
};

export const describeDownloadDirectory = async () => {
  const handle = await getStoredDownloadDirectory();
  if (!handle) return { handle: undefined, permission: 'none' as const, name: '' };
  return { handle, permission: await queryDirectoryPermission(handle), name: handle.name };
};

/** Keeps ` (1)`, ` (2)` … suffixes so batch downloads never overwrite an existing file. */
export const resolveUniqueFileName = async (directory: FileSystemDirectoryHandle, fileName: string): Promise<string> => {
  const dotIndex = fileName.lastIndexOf('.');
  const base = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
  const extension = dotIndex > 0 ? fileName.slice(dotIndex) : '';

  for (let index = 0; index < 200; index += 1) {
    const candidate = index === 0 ? fileName : `${base} (${index})${extension}`;
    try {
      await directory.getFileHandle(candidate);
    } catch {
      return candidate;
    }
  }
  return `${base}-${Date.now()}${extension}`;
};

export const writeBlobToDirectory = async (
  directory: FileSystemDirectoryHandle,
  fileName: string,
  blob: Blob,
): Promise<string> => {
  const uniqueName = await resolveUniqueFileName(directory, fileName);
  const fileHandle = await directory.getFileHandle(uniqueName, { create: true });
  const writable = await fileHandle.createWritable();
  try {
    await writable.write(blob);
  } finally {
    await writable.close();
  }
  return `${directory.name}/${uniqueName}`;
};
