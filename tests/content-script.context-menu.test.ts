/** @vitest-environment jsdom */

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createChromeMock } from './helpers/chrome-mock';

const { chromeMock } = createChromeMock();

describe('content script context-target bridge', () => {
  beforeAll(async () => {
    (globalThis as any).chrome = chromeMock;
    await import('../src/scripts/contentscript/index.ts');
  });

  beforeEach(() => {
    chromeMock.runtime.sendMessage.mockClear();
    document.body.innerHTML = '';
    window.history.replaceState({}, '', '/');
  });

  it('falls back to the current page source when right-clicking plain video content', () => {
    window.history.replaceState({}, '', '/video/BV1BQ4y1X714');
    const target = document.createElement('div');
    document.body.appendChild(target);

    target.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));

    expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'context-target-change',
        data: {
          source: { type: 'bvid', bvid: 'BV1BQ4y1X714' },
          targetType: 'non-link-item',
        },
      }),
      expect.any(Function),
    );
  });

  it('extracts favorite ids from non-link sidebar items without relying on hrefs', () => {
    const item = document.createElement('div');
    item.setAttribute('data-fid', '1042352181');
    const child = document.createElement('span');
    item.appendChild(child);
    document.body.appendChild(item);

    child.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));

    expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'context-target-change',
        data: {
          source: { type: 'fav', mid: '1042352181' },
          targetType: 'non-link-item',
        },
      }),
      expect.any(Function),
    );
  });
});
