import type { Page, Route } from '@playwright/test';

type VideoFixture = {
  bvid: string;
  cid: string;
  title: string;
  ownerName: string;
  ownerMid: number;
};

type PopupStateOverrides = Record<string, unknown>;

type NetworkFixtureOverrides = {
  videos?: Record<string, VideoFixture>;
  favoriteResults?: Record<string, string[]>;
  collectionResults?: Record<string, string[]>;
  seriesResults?: Record<string, string[]>;
};

const COVER_DATA_URL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='480' height='480'%3E%3Crect width='100%25' height='100%25' fill='%23f2e6ff'/%3E%3Ctext x='50%25' y='50%25' font-size='34' text-anchor='middle' dominant-baseline='middle' fill='%23835acc'%3EAzusa%3C/text%3E%3C/svg%3E";

export const BVID_SEARCH = 'BV1Sr4y1d7EF';
export const FAVORITE_ID = '1042352181';
export const COLLECTION_URL = 'https://space.bilibili.com/5109111/lists/6995126?type=season';
export const SERIES_URL = 'https://space.bilibili.com/444180997/lists/828030?type=series';

const DEFAULT_PLAYLIST_ID = 'FavList-default';

const VIDEO_LIBRARY: Record<string, VideoFixture> = {
  BV1yNPbzjEVq: {
    bvid: 'BV1yNPbzjEVq',
    cid: '36507159061',
    title: 'Default Song',
    ownerName: 'Test UP',
    ownerMid: 1001,
  },
  [BVID_SEARCH]: {
    bvid: BVID_SEARCH,
    cid: '99887766',
    title: 'Search Match Song',
    ownerName: 'Search UP',
    ownerMid: 1002,
  },
  BV1Fv4y1d7AB: {
    bvid: 'BV1Fv4y1d7AB',
    cid: '11223344',
    title: 'Favorite Song 1',
    ownerName: 'Favorite UP 1',
    ownerMid: 1003,
  },
  BV1Fv4y1d7AC: {
    bvid: 'BV1Fv4y1d7AC',
    cid: '22334455',
    title: 'Favorite Song 2',
    ownerName: 'Favorite UP 2',
    ownerMid: 1004,
  },
  BV1Se4y1d7AD: {
    bvid: 'BV1Se4y1d7AD',
    cid: '33445566',
    title: 'Collection Song 1',
    ownerName: 'Collection UP',
    ownerMid: 1005,
  },
  BV1Sy4y1d7AE: {
    bvid: 'BV1Sy4y1d7AE',
    cid: '44556677',
    title: 'Series Song 1',
    ownerName: 'Series UP',
    ownerMid: 1006,
  },
};

const DEFAULT_FAVORITES: Record<string, string[]> = {
  [FAVORITE_ID]: ['BV1Fv4y1d7AB', 'BV1Fv4y1d7AC'],
};

const DEFAULT_COLLECTIONS: Record<string, string[]> = {
  '5109111:6995126': ['BV1Se4y1d7AD'],
};

const DEFAULT_SERIES: Record<string, string[]> = {
  '444180997:828030': ['BV1Sy4y1d7AE'],
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const toStoredSong = (video: VideoFixture) => ({
  id: video.cid,
  bvid: video.bvid,
  name: video.title,
  singer: video.ownerName,
  singerId: String(video.ownerMid),
  cover: COVER_DATA_URL,
});

const baseLocalState = () => {
  const defaultSong = toStoredSong(VIDEO_LIBRARY.BV1yNPbzjEVq);

  return {
    MyFavList: [DEFAULT_PLAYLIST_ID],
    [DEFAULT_PLAYLIST_ID]: {
      info: {
        id: DEFAULT_PLAYLIST_ID,
        title: 'Azusa Test Playlist',
      },
      songList: [defaultSong],
    },
    LastPlayList: [defaultSong],
    PlayerSetting: {
      playMode: 'order',
      defaultVolume: 0.5,
      darkMode: false,
      selectedFavId: DEFAULT_PLAYLIST_ID,
      lyricFontSize: 16,
    },
    LyricMappings: [],
  };
};

const buildJsonResponse = (payload: unknown) => ({
  status: 200,
  contentType: 'application/json; charset=utf-8',
  headers: {
    'access-control-allow-origin': '*',
  },
  body: JSON.stringify(payload),
});

const fulfillNotFound = (route: Route, label: string) =>
  route.fulfill(buildJsonResponse({ code: 404, message: `Unhandled mock for ${label}` }));

const buildVideoInfoPayload = (video: VideoFixture) => ({
  data: {
    title: video.title,
    desc: '',
    videos: 1,
    pic: COVER_DATA_URL,
    owner: { name: video.ownerName, mid: video.ownerMid },
    pages: [{ part: video.title, cid: video.cid }],
  },
});

export async function seedPopupState(page: Page, overrides: PopupStateOverrides = {}, options: { replaceExisting?: boolean } = {}) {
  const localState = {
    ...baseLocalState(),
    ...clone(overrides),
  };

  await page.addInitScript(({ seededLocalState, replaceExisting }) => {
    if (replaceExisting || !window.localStorage.getItem('azusa-player:local')) {
      window.localStorage.setItem('azusa-player:local', JSON.stringify(seededLocalState));
    }
    if (replaceExisting || !window.localStorage.getItem('azusa-player:sync')) {
      window.localStorage.setItem('azusa-player:sync', JSON.stringify({}));
    }
  }, { seededLocalState: localState, replaceExisting: !!options.replaceExisting });
}

export async function installPopupNetworkMocks(page: Page, overrides: NetworkFixtureOverrides = {}) {
  const videos = {
    ...VIDEO_LIBRARY,
    ...(overrides.videos || {}),
  };
  const favoriteResults = {
    ...DEFAULT_FAVORITES,
    ...(overrides.favoriteResults || {}),
  };
  const collectionResults = {
    ...DEFAULT_COLLECTIONS,
    ...(overrides.collectionResults || {}),
  };
  const seriesResults = {
    ...DEFAULT_SERIES,
    ...(overrides.seriesResults || {}),
  };

  await page.route('https://api.bilibili.com/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/x/web-interface/view') {
      const bvid = url.searchParams.get('bvid') || '';
      const video = videos[bvid];
      if (!video) {
        await fulfillNotFound(route, `video ${bvid}`);
        return;
      }

      await route.fulfill(buildJsonResponse(buildVideoInfoPayload(video)));
      return;
    }

    if (url.pathname === '/x/player/playurl') {
      await route.fulfill(
        buildJsonResponse({
          data: {
            dash: {
              audio: [
                { id: 1, bandwidth: 100, codecs: 'aac', baseUrl: 'https://mock.local/audio-low.mp3' },
                { id: 2, bandwidth: 200, codecs: 'mp4a.40.2', baseUrl: 'https://mock.local/audio-high.mp3' },
              ],
            },
          },
        }),
      );
      return;
    }

    if (url.pathname === '/x/v3/fav/resource/list') {
      const mediaId = url.searchParams.get('media_id') || '';
      const bvids = favoriteResults[mediaId] || [];
      await route.fulfill(
        buildJsonResponse({
          data: {
            info: { media_count: bvids.length },
            medias: bvids.map((bvid) => ({ bvid })),
          },
        }),
      );
      return;
    }

    if (url.pathname === '/x/polymer/web-space/seasons_archives_list') {
      const mid = url.searchParams.get('mid') || '';
      const sid = url.searchParams.get('season_id') || '';
      const key = `${mid}:${sid}`;
      const bvids = collectionResults[key] || [];
      await route.fulfill(
        buildJsonResponse({
          data: {
            meta: { total: bvids.length },
            page: { page_size: 30 },
            archives: bvids.map((bvid) => ({ bvid })),
          },
        }),
      );
      return;
    }

    if (url.pathname === '/x/series/archives') {
      const mid = url.searchParams.get('mid') || '';
      const sid = url.searchParams.get('series_id') || '';
      const key = `${mid}:${sid}`;
      const bvids = seriesResults[key] || [];
      await route.fulfill(
        buildJsonResponse({
          data: {
            archives: bvids.map((bvid) => ({ bvid })),
          },
        }),
      );
      return;
    }

    await fulfillNotFound(route, url.pathname);
  });

  await page.route('https://c.y.qq.com/**', async (route) => {
    await route.fulfill(
      buildJsonResponse({
        data: {
          song: {
            itemlist: [{ mid: 'qq-mid-1', name: 'Default Song', singer: 'Test UP' }],
          },
        },
      }),
    );
  });

  await page.route('https://u.y.qq.com/**', async (route) => {
    await route.fulfill(
      buildJsonResponse({
        req: {
          data: {
            body: {
              song: {
                list: [{ mid: 'qq-mid-1', name: 'Default Song', singer: [{ name: 'Test UP' }] }],
              },
            },
          },
        },
      }),
    );
  });

  await page.route('https://i.y.qq.com/**', async (route) => {
    await route.fulfill(
      buildJsonResponse({
        lyric: '[00:00.000] Mock lyric',
      }),
    );
  });

  await page.route('https://i0.hdslb.com/**', async (route) => {
    await route.fulfill({ status: 204, body: '' });
  });
}

export async function openPopup(page: Page, overrides?: {
  state?: PopupStateOverrides;
  network?: NetworkFixtureOverrides;
  replaceExistingState?: boolean;
}) {
  await seedPopupState(page, overrides?.state, { replaceExisting: overrides?.replaceExistingState });
  await installPopupNetworkMocks(page, overrides?.network);
  await page.goto('/src/popup/index.html');
}
