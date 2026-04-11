import type { SearchSource } from '../background/DataProcess';

export type ContextTargetPayload = {
  source: SearchSource | null;
  targetType: 'non-link-item' | 'none';
};

const NUMERIC_PATTERN = /^\d+$/;
const BVID_PATTERN = /(BV[a-zA-Z0-9]{10})/;

export const extractBvid = (targetUrl = '') => targetUrl.match(BVID_PATTERN)?.[1];

export const parseSearchSource = (targetUrl?: string, baseUrl = 'https://www.bilibili.com/'): SearchSource | undefined => {
  if (!targetUrl) return undefined;

  const bvid = extractBvid(targetUrl);
  if (bvid) {
    return { type: 'bvid', bvid };
  }

  try {
    const url = new URL(targetUrl, baseUrl);
    if (url.hostname !== 'space.bilibili.com') return undefined;

    const pathParts = url.pathname.split('/').filter(Boolean);
    const mid = pathParts[0];
    if (!NUMERIC_PATTERN.test(mid || '')) return undefined;

    if (pathParts[1] === 'favlist') {
      const fid = url.searchParams.get('fid');
      if (fid && NUMERIC_PATTERN.test(fid)) {
        return { type: 'fav', mid: fid };
      }
    }

    if (pathParts[1] === 'lists' && NUMERIC_PATTERN.test(pathParts[2] || '')) {
      const sid = pathParts[2];
      const listType = url.searchParams.get('type');
      if (listType === 'series') return { type: 'series', mid, sid };
      if (listType === 'season') return { type: 'collection', mid, sid };
    }

    if (pathParts[1] === 'channel' && pathParts[2] === 'seriesdetail') {
      const sid = url.searchParams.get('sid');
      if (sid && NUMERIC_PATTERN.test(sid)) return { type: 'series', mid, sid };
    }

    if (pathParts[1] === 'channel' && pathParts[2] === 'collectiondetail') {
      const sid = url.searchParams.get('sid');
      if (sid && NUMERIC_PATTERN.test(sid)) return { type: 'collection', mid, sid };
    }
  } catch {
    return undefined;
  }

  return undefined;
};

const getStringAttr = (element: Element | null, attributeNames: string[]) => {
  if (!(element instanceof HTMLElement)) return undefined;
  for (const attributeName of attributeNames) {
    const value = element.getAttribute(attributeName);
    if (value) return value;
  }
  return undefined;
};

export const getTargetUrlFromElement = (element: Element | null) => {
  const target = element?.closest('[href], [data-href], [data-url], [data-target-url]') as HTMLElement | null;
  if (!target) return undefined;

  if (target instanceof HTMLAnchorElement) {
    return target.href;
  }

  return getStringAttr(target, ['href', 'data-href', 'data-url', 'data-target-url']);
};

const getFavIdFromElement = (element: Element | null) => {
  const target = element?.closest('.fav-sidebar-item[id], [data-fid], [data-fid-value], [data-media-id]') as HTMLElement | null;
  if (!target) return undefined;

  const candidate = getStringAttr(target, ['data-fid', 'data-fid-value', 'data-media-id', 'id']);
  return candidate && NUMERIC_PATTERN.test(candidate) ? candidate : undefined;
};

export const parseContextTarget = (element: Element | null, pageUrl?: string): ContextTargetPayload => {
  const pageSource = parseSearchSource(pageUrl, pageUrl);
  const elementUrl = getTargetUrlFromElement(element);
  const elementSource = parseSearchSource(elementUrl, pageUrl || baseUrlFromPage(pageUrl));
  if (elementSource) {
    return {
      source: elementSource,
      targetType: 'non-link-item',
    };
  }

  const favId = getFavIdFromElement(element);
  if (favId) {
    return {
      source: { type: 'fav', mid: favId },
      targetType: 'non-link-item',
    };
  }

  if (pageSource) {
    return {
      source: pageSource,
      targetType: 'non-link-item',
    };
  }

  return {
    source: null,
    targetType: 'none',
  };
};

const baseUrlFromPage = (pageUrl?: string) => {
  if (!pageUrl) return 'https://www.bilibili.com/';
  try {
    return new URL(pageUrl).origin;
  } catch {
    return 'https://www.bilibili.com/';
  }
};
