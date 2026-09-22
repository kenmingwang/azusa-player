import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isDirectoryPickerSupported,
  queryDirectoryPermission,
  resolveUniqueFileName,
  verifyDirectoryPermission,
  writeBlobToDirectory,
} from '../src/utils/fileSystemAccess';

const buildDirectoryHandle = (existing: string[] = []) => ({
  name: '我的音乐',
  getFileHandle: vi.fn(async (fileName: string, options?: { create?: boolean }) => {
    if (!options?.create && !existing.includes(fileName)) {
      throw new DOMException('File does not exist', 'NotFoundError');
    }
    return { __fileName: fileName };
  }),
});

describe('fileSystemAccess helpers', () => {
  beforeEach(() => {
    delete (globalThis as any).window;
  });

  it('reports the picker as unsupported outside a browser page', () => {
    expect(isDirectoryPickerSupported()).toBe(false);
  });

  it('reports the picker as supported when Chrome exposes it', () => {
    (globalThis as any).window = { showDirectoryPicker: () => undefined };
    expect(isDirectoryPickerSupported()).toBe(true);
  });

  it('treats a granted handle as writable', async () => {
    const handle = { name: 'x', queryPermission: vi.fn(async () => 'granted') };
    await expect(verifyDirectoryPermission(handle as any)).resolves.toBe(true);
  });

  it('requires a gesture to re-grant a downgraded handle', async () => {
    const handle = {
      name: 'x',
      queryPermission: vi.fn(async () => 'prompt'),
      requestPermission: vi.fn(async () => 'granted'),
    };

    await expect(verifyDirectoryPermission(handle as any)).resolves.toBe(false);
    expect(handle.requestPermission).not.toHaveBeenCalled();

    await expect(verifyDirectoryPermission(handle as any, true)).resolves.toBe(true);
    expect(handle.requestPermission).toHaveBeenCalledWith({ mode: 'readwrite' });
  });

  it('reports denied permissions as not writable', async () => {
    const handle = { name: 'x', queryPermission: vi.fn(async () => 'denied'), requestPermission: vi.fn(async () => 'denied') };
    await expect(verifyDirectoryPermission(handle as any, true)).resolves.toBe(false);
  });

  it('returns the raw permission state for the UI', async () => {
    await expect(queryDirectoryPermission({ name: 'x', queryPermission: async () => 'prompt' } as any)).resolves.toBe('prompt');
    await expect(queryDirectoryPermission({ name: 'x' } as any)).resolves.toBe('granted');
  });

  it('leaves a free file name untouched', async () => {
    await expect(resolveUniqueFileName(buildDirectoryHandle() as any, '夜に駆ける.m4a')).resolves.toBe('夜に駆ける.m4a');
  });

  it('adds a suffix instead of overwriting an existing file', async () => {
    const directory = buildDirectoryHandle(['夜に駆ける.m4a', '夜に駆ける (1).m4a']);
    await expect(resolveUniqueFileName(directory as any, '夜に駆ける.m4a')).resolves.toBe('夜に駆ける (2).m4a');
  });

  it('keeps the extension when generating a suffixed name', async () => {
    const directory = buildDirectoryHandle(['song.flac']);
    await expect(resolveUniqueFileName(directory as any, 'song.flac')).resolves.toBe('song (1).flac');
  });

  it('writes the blob and reports the location inside the picked folder', async () => {
    const written: Blob[] = [];
    const directory = {
      name: '我的音乐',
      getFileHandle: vi.fn(async (fileName: string, options?: { create?: boolean }) => {
        if (!options?.create) throw new DOMException('File does not exist', 'NotFoundError');
        return {
          createWritable: async () => ({
            write: async (blob: Blob) => {
              written.push(blob);
            },
            close: async () => undefined,
          }),
        };
      }),
    };

    const location = await writeBlobToDirectory(directory as any, '夜に駆ける.m4a', new Blob(['abc']));

    expect(location).toBe('我的音乐/夜に駆ける.m4a');
    expect(written).toHaveLength(1);
    expect(written[0].size).toBe(3);
  });

  it('propagates directory failures so the caller can fall back', async () => {
    const directory = {
      name: 'locked',
      getFileHandle: vi.fn(async () => {
        throw new DOMException('denied', 'NotAllowedError');
      }),
    };

    await expect(writeBlobToDirectory(directory as any, 'a.m4a', new Blob(['a']))).rejects.toThrow();
  });
});
