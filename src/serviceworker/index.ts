import { getSongsFromSource, type SearchSource } from '../background/DataProcess';
import { parseSearchSource, type ContextTargetPayload } from '../utils/searchSource';

chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

const MY_FAV_LIST_KEY = 'MyFavList';
const LINK_MENU_ID = 'AddToPlayListLink';
const PAGE_MENU_ID = 'AddToPlayListPage';
const ELEMENT_MENU_ID = 'AddToPlayListElement';
const EMPTY_LINK_MENU_ID = 'NoFavListLink';
const EMPTY_PAGE_MENU_ID = 'NoFavListPage';
const EMPTY_ELEMENT_MENU_ID = 'NoFavListElement';

const SUPPORTED_LINK_PATTERNS = [
  'https://*.bilibili.com/video/*',
  'https://www.bilibili.com/video/*',
  'https://space.bilibili.com/*/favlist*',
  'https://space.bilibili.com/*/lists/*',
  'https://space.bilibili.com/*/channel/seriesdetail*',
  'https://space.bilibili.com/*/channel/collectiondetail*',
];

const SUPPORTED_PAGE_PATTERNS = [
  'https://*.bilibili.com/video/*',
  'https://www.bilibili.com/video/*',
  'https://space.bilibili.com/*/favlist*',
  'https://space.bilibili.com/*/lists/*',
  'https://space.bilibili.com/*/channel/seriesdetail*',
  'https://space.bilibili.com/*/channel/collectiondetail*',
];

type FavInfo = {
  id: string;
  title: string;
};

let latestFavMenuInfos: FavInfo[] = [];
let isRenderingMenus = false;
let shouldRenderMenusAgain = false;
const specialContextByTabId = new Map<number, SearchSource>();
const contextMenusApi = chrome.contextMenus as typeof chrome.contextMenus & {
  onShown?: {
    addListener: (listener: (info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => void) => void;
  };
  onHidden?: {
    addListener: (listener: () => void) => void;
  };
  refresh?: () => void;
};

const isFavInfo = (value: unknown): value is FavInfo => {
  const candidate = value as FavInfo | undefined;
  return !!candidate?.id && !!candidate?.title;
};

const describeSource = (source: SearchSource) => {
  switch (source.type) {
    case 'bvid':
      return source.bvid;
    case 'fav':
      return `收藏夹 ${source.mid}`;
    case 'series':
      return `series ${source.sid}`;
    case 'collection':
      return `season ${source.sid}`;
    default:
      return '来源链接';
  }
};

const sendFavUpdate = (favId: string, count: number) => {
  chrome.runtime.sendMessage(
    {
      type: 'fav-update',
      data: { favId, count, fav_id: favId, n: count },
    },
    () => {
      chrome.runtime.lastError;
    },
  );
};

const notify = (title: string, message: string) => {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon-128.png',
    title,
    message,
  });
};

const removeAllMenus = () =>
  new Promise<void>((resolve) => {
    chrome.contextMenus.removeAll(() => {
      chrome.runtime.lastError;
      resolve();
    });
  });

const createMenuItem = (createProperties: chrome.contextMenus.CreateProperties) =>
  new Promise<void>((resolve) => {
    chrome.contextMenus.create(createProperties, () => {
      const errorMessage = chrome.runtime.lastError?.message;
      if (errorMessage && !errorMessage.includes('duplicate id')) {
        console.warn('[azusa-player][context-menu] create failed', errorMessage, createProperties.id);
      }
      resolve();
    });
  });

const toLinkChildId = (favId: string) => `link::${favId}`;
const toPageChildId = (favId: string) => `page::${favId}`;
const toElementChildId = (favId: string) => `element::${favId}`;

const updateElementMenuVisibility = (visible: boolean) => {
  chrome.contextMenus.update(
    ELEMENT_MENU_ID,
    { visible },
    () => {
      chrome.runtime.lastError;
      contextMenusApi.refresh?.();
    },
  );
};

const renderMenuItems = async (favListsInfo: FavInfo[]) => {
  await removeAllMenus();

  await createMenuItem({
    id: LINK_MENU_ID,
    title: '添加到歌单',
    contexts: ['link'],
    targetUrlPatterns: SUPPORTED_LINK_PATTERNS,
  });

  await createMenuItem({
    id: PAGE_MENU_ID,
    title: '添加到歌单',
    contexts: ['page'],
    documentUrlPatterns: SUPPORTED_PAGE_PATTERNS,
  });

  await createMenuItem({
    id: ELEMENT_MENU_ID,
    title: '添加到歌单',
    contexts: ['all'],
    documentUrlPatterns: SUPPORTED_PAGE_PATTERNS,
    visible: false,
  });

  if (favListsInfo.length > 0) {
    for (const info of favListsInfo) {
      await createMenuItem({
        id: toLinkChildId(info.id),
        parentId: LINK_MENU_ID,
        title: info.title,
        contexts: ['link'],
      });

      await createMenuItem({
        id: toPageChildId(info.id),
        parentId: PAGE_MENU_ID,
        title: info.title,
        contexts: ['page'],
      });

      await createMenuItem({
        id: toElementChildId(info.id),
        parentId: ELEMENT_MENU_ID,
        title: info.title,
        contexts: ['all'],
      });
    }
    return;
  }

  await createMenuItem({
    id: EMPTY_LINK_MENU_ID,
    parentId: LINK_MENU_ID,
    title: '请先创建一个歌单',
    enabled: false,
    contexts: ['link'],
  });

  await createMenuItem({
    id: EMPTY_PAGE_MENU_ID,
    parentId: PAGE_MENU_ID,
    title: '请先创建一个歌单',
    enabled: false,
    contexts: ['page'],
  });

  await createMenuItem({
    id: EMPTY_ELEMENT_MENU_ID,
    parentId: ELEMENT_MENU_ID,
    title: '请先创建一个歌单',
    enabled: false,
    contexts: ['all'],
  });
};

const requestMenuRender = (favListsInfo: FavInfo[]) => {
  latestFavMenuInfos = favListsInfo;
  if (isRenderingMenus) {
    shouldRenderMenusAgain = true;
    return;
  }

  void (async () => {
    isRenderingMenus = true;
    do {
      shouldRenderMenusAgain = false;
      await renderMenuItems(latestFavMenuInfos);
    } while (shouldRenderMenusAgain);
    isRenderingMenus = false;
  })();
};

const loadFavMenuInfos = () => {
  chrome.storage.local.get(MY_FAV_LIST_KEY, (result) => {
    const favListKeys: string[] = result[MY_FAV_LIST_KEY] || [];
    if (!favListKeys.length) {
      requestMenuRender([]);
      return;
    }

    chrome.storage.local.get(favListKeys, (listObj) => {
      const favInfos = favListKeys
        .map((id) => (listObj[id] as { info?: FavInfo } | undefined)?.info)
        .filter(isFavInfo);

      requestMenuRender(favInfos);
    });
  });
};

loadFavMenuInfos();

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'fav-lists-change') {
    requestMenuRender(Array.isArray(message.data) ? message.data.filter(isFavInfo) : []);
  }
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type !== 'context-target-change') return;

  const tabId = sender.tab?.id;
  if (typeof tabId !== 'number') return;

  const payload = (message.data || { source: null, targetType: 'none' }) as ContextTargetPayload;
  if (payload.targetType === 'non-link-item' && payload.source) {
    specialContextByTabId.set(tabId, payload.source);
  } else {
    specialContextByTabId.delete(tabId);
  }
});

contextMenusApi.onShown?.addListener((info, tab) => {
  const source = typeof tab?.id === 'number' ? specialContextByTabId.get(tab.id) : undefined;
  const shouldShow = !!source && !info.linkUrl;
  updateElementMenuVisibility(shouldShow);
});

contextMenusApi.onHidden?.addListener(() => {
  updateElementMenuVisibility(false);
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (typeof info.menuItemId !== 'string') return;
  if (info.menuItemId === LINK_MENU_ID || info.menuItemId === PAGE_MENU_ID || info.menuItemId === ELEMENT_MENU_ID) return;
  if (info.menuItemId === EMPTY_LINK_MENU_ID || info.menuItemId === EMPTY_PAGE_MENU_ID || info.menuItemId === EMPTY_ELEMENT_MENU_ID) return;

  const isLinkMenu = info.menuItemId.startsWith('link::');
  const isPageMenu = info.menuItemId.startsWith('page::');
  const isElementMenu = info.menuItemId.startsWith('element::');
  if (!isLinkMenu && !isPageMenu && !isElementMenu) return;

  const favId = info.menuItemId.slice(info.menuItemId.indexOf('::') + 2);
  const favName = latestFavMenuInfos.find((v) => v.id === favId)?.title;
  if (!favName) return;

  const tabId = typeof tab?.id === 'number' ? tab.id : undefined;
  const source = isElementMenu
    ? (typeof tabId === 'number' ? specialContextByTabId.get(tabId) : undefined)
    : parseSearchSource(isLinkMenu ? info.linkUrl : info.pageUrl);
  if (!source) {
    notify('添加失败', '当前目标不是支持的 B 站视频 / 收藏夹 / 合集 / series / season。');
    return;
  }

  addSourceToFav(source, favId, tabId)
    .then((count) => {
      sendFavUpdate(favId, count);
      notify('已添加到歌单', `已将 ${describeSource(source)} 添加到 ${favName}`);
    })
    .catch((error) => {
      console.error('[azusa-player][context-menu] add failed', error);
      notify('添加失败', `无法将 ${describeSource(source)} 添加到 ${favName}`);
    });
});

async function addSourceToFav(source: SearchSource, favId: string, tabId?: number) {
  const songs = await getSongsFromCurrentPage(source, tabId);
  const fav = (await getFromLocalStorage([favId]))[favId];
  if (!fav?.songList) {
    throw new Error(`Fav list ${favId} is missing.`);
  }

  const filtered = songs.filter((song) => fav.songList.find((item: any) => item.id == song.id) === undefined);
  const newFav = { info: fav.info, songList: filtered.concat(fav.songList) };

  return new Promise<number>((resolve) => {
    chrome.storage.local.set({ [favId]: newFav }, () => {
      resolve(filtered.length);
    });
  });
}

async function getSongsFromCurrentPage(source: SearchSource, tabId?: number): Promise<any[]> {
  if (typeof tabId !== 'number') {
    return getSongsFromSource(source);
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      args: [source],
      func: fetchSongsInPageContext,
    });

    const songs = results?.[0]?.result;
    if (!Array.isArray(songs)) {
      throw new Error('No songs returned from page context.');
    }
    return songs;
  } catch (error) {
    console.warn('[azusa-player][context-menu] page-context fetch failed', error);
    throw error;
  }
}

async function fetchSongsInPageContext(source: SearchSource) {
  const URL_VIDEO_INFO = 'https://api.bilibili.com/x/web-interface/view?bvid={bvid}';
  const URL_BILISERIES_INFO =
    'https://api.bilibili.com/x/series/archives?mid={mid}&series_id={sid}&only_normal=true&sort=desc&pn={pn}&ps=30';
  const URL_BILICOLLE_INFO =
    'https://api.bilibili.com/x/polymer/web-space/seasons_archives_list?mid={mid}&season_id={sid}&sort_reverse=false&page_num={pn}&page_size=30';
  const URL_FAV_LIST =
    'https://api.bilibili.com/x/v3/fav/resource/list?media_id={mid}&pn={pn}&ps=20&keyword=&order=mtime&type=0&tid=0&platform=web&jsonp=jsonp';

  const fetchJson = async (url: string) => {
    const response = await fetch(url, {
      credentials: 'include',
      headers: {
        Accept: 'application/json, text/plain, */*',
      },
    });

    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();
    if (!contentType.includes('application/json')) {
      throw new Error(`Expected JSON from ${url}, received ${contentType || 'unknown'}: ${text.slice(0, 120)}`);
    }

    const json = JSON.parse(text);
    if (typeof json?.code === 'number' && json.code !== 0) {
      throw new Error(json.message || json.msg || `Bilibili API error ${json.code}`);
    }

    return json;
  };

  const toSongs = (data: any, bvid: string) => {
    const pages = Array.isArray(data?.pages) ? data.pages : [];
    const baseSong = {
      bvid,
      singer: String(data?.owner?.name || ''),
      singerId: data?.owner?.mid ?? '',
      cover: String(data?.pic || ''),
      lyric: '',
      lyricOffset: 0,
    };

    if (pages.length <= 1) {
      const cid = String(pages[0]?.cid || data?.cid || '');
      if (!cid) return [];
      return [
        {
          ...baseSong,
          id: cid,
          name: String(data?.title || bvid),
        },
      ];
    }

    return pages
      .map((page: any) => {
        const cid = String(page?.cid || '');
        if (!cid) return null;
        return {
          ...baseSong,
          id: cid,
          name: String(page?.part || data?.title || bvid),
        };
      })
      .filter(Boolean);
  };

  const fetchVideoSongs = async (bvid: string) => {
    const json = await fetchJson(URL_VIDEO_INFO.replace('{bvid}', bvid));
    return toSongs(json?.data, bvid);
  };

  const fetchSongsByBvids = async (bvids: string[]) => {
    const uniqueBvids = Array.from(new Set(bvids.filter(Boolean)));
    const songGroups = await Promise.all(uniqueBvids.map((bvid) => fetchVideoSongs(bvid)));
    return songGroups.flat();
  };

  if (source.type === 'bvid') {
    return fetchVideoSongs(source.bvid);
  }

  if (source.type === 'fav') {
    const firstPage = await fetchJson(URL_FAV_LIST.replace('{mid}', source.mid).replace('{pn}', '1'));
    const mediaCount = Number(firstPage?.data?.info?.media_count || 0);
    const totalPages = Math.max(1, Math.ceil(mediaCount / 20));
    const pageRequests = [Promise.resolve(firstPage)];

    for (let page = 2; page <= totalPages; page += 1) {
      pageRequests.push(fetchJson(URL_FAV_LIST.replace('{mid}', source.mid).replace('{pn}', String(page))));
    }

    const pages = await Promise.all(pageRequests);
    const bvids = pages.flatMap((pageJson: any) =>
      (pageJson?.data?.medias || []).map((media: any) => String(media?.bvid || '')).filter(Boolean),
    );
    return fetchSongsByBvids(bvids);
  }

  if (source.type === 'series') {
    const firstPage = await fetchJson(
      URL_BILISERIES_INFO.replace('{mid}', source.mid).replace('{sid}', source.sid).replace('{pn}', '1'),
    );
    const archives = firstPage?.data?.archives || [];
    const bvids = archives.map((item: any) => String(item?.bvid || '')).filter(Boolean);
    return fetchSongsByBvids(bvids);
  }

  if (source.type === 'collection') {
    const firstPage = await fetchJson(
      URL_BILICOLLE_INFO.replace('{mid}', source.mid).replace('{sid}', source.sid).replace('{pn}', '1'),
    );
    const totalCount = Number(firstPage?.data?.meta?.total || 0);
    const pageSize = Number(firstPage?.data?.page?.page_size || 30);
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const pageRequests = [Promise.resolve(firstPage)];

    for (let page = 2; page <= totalPages; page += 1) {
      pageRequests.push(
        fetchJson(URL_BILICOLLE_INFO.replace('{mid}', source.mid).replace('{sid}', source.sid).replace('{pn}', String(page))),
      );
    }

    const pages = await Promise.all(pageRequests);
    const bvids = pages.flatMap((pageJson: any) =>
      (pageJson?.data?.archives || []).map((item: any) => String(item?.bvid || '')).filter(Boolean),
    );
    return fetchSongsByBvids(bvids);
  }

  return [];
}

async function getFromLocalStorage(keys: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, (result) => {
      if (Object.keys(result).length > 0) {
        resolve(result);
      } else {
        reject(new Error(`Storage key not found: ${keys.join(', ')}`));
      }
    });
  });
}

export {};
