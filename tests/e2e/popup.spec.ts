import { expect, test, type Locator, type Page } from '@playwright/test';
import { BVID_SEARCH, COLLECTION_URL, FAVORITE_ID, SERIES_URL, openPopup } from './helpers/popup-fixtures';

const search = async (page: Page, value: string) => {
  const searchInput = page.locator('#search-input');
  await searchInput.fill(value);
  await searchInput.press('Enter');
};

const hasReadableContrast = async (locator: Locator) =>
  locator.first().evaluate((element) => {
    const parseColor = (value: string) => {
      const match = value.match(/\d+(\.\d+)?/g) || [];
      return match.slice(0, 3).map((part) => Number(part));
    };

    const distance = (left: number[], right: number[]) =>
      Math.sqrt(left.reduce((sum, value, index) => sum + (value - right[index]) ** 2, 0));

    const findBackground = (start: Element | null) => {
      let current = start as HTMLElement | null;
      while (current) {
        const background = getComputedStyle(current).backgroundColor;
        if (background && background !== 'rgba(0, 0, 0, 0)' && background !== 'transparent') {
          return background;
        }
        current = current.parentElement;
      }
      return getComputedStyle(document.body).backgroundColor;
    };

    const foreground = parseColor(getComputedStyle(element).color);
    const background = parseColor(findBackground(element));
    return distance(foreground, background) > 90;
  });

const readStoredPlayMode = (page: Page) =>
  page.evaluate(() => JSON.parse(window.localStorage.getItem('azusa-player:local') || '{}').PlayerSetting?.playMode);

const readPlayerState = async (page: Page) =>
  page.getByTestId('player-state').evaluate((element) => ({
    playMode: (element as HTMLElement).dataset.playMode || '',
    currentAudioId: (element as HTMLElement).dataset.currentAudioId || '',
    queue: JSON.parse((element as HTMLElement).dataset.queue || '[]') as string[],
  }));

const cyclePlayModeUntil = async (page: Page, expectedMode: string) => {
  const testIdByMode: Record<string, string> = {
    order: 'set-play-mode-order',
    orderLoop: 'set-play-mode-order-loop',
    singleLoop: 'set-play-mode-single-loop',
    shufflePlay: 'set-play-mode-shuffle',
  };
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if ((await readStoredPlayMode(page)) === expectedMode) return;
    await page.getByTestId(testIdByMode[expectedMode]).dispatchEvent('click');
    await expect.poll(() => readStoredPlayMode(page)).toBeTruthy();
  }
  expect(await readStoredPlayMode(page)).toBe(expectedMode);
};

test.describe('popup e2e', () => {
  test.beforeEach(async ({ page }) => {
    await openPopup(page);
  });

  test('renders the seeded popup and persists dark mode across reload', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Azusa Test Playlist' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Default Song' })).toBeVisible();
    expect(await hasReadableContrast(page.getByRole('heading', { name: 'Azusa Test Playlist' }))).toBeTruthy();
    expect(await hasReadableContrast(page.getByRole('button', { name: 'Default Song' }))).toBeTruthy();
    expect(await hasReadableContrast(page.getByRole('button', { name: 'Azusa Test Playlist' }))).toBeTruthy();
    expect(await hasReadableContrast(page.locator('#search-input'))).toBeTruthy();

    await page.getByTestId('toggle-dark-mode').click();

    await expect.poll(async () => page.evaluate(() => document.body.dataset.theme)).toBe('dark');
    await expect
      .poll(async () =>
        page.evaluate(() => JSON.parse(window.localStorage.getItem('azusa-player:local') || '{}').PlayerSetting?.darkMode),
      )
      .toBe(true);

    await page.reload();

    await expect.poll(async () => page.evaluate(() => document.body.dataset.theme)).toBe('dark');
    await expect(page.getByRole('heading', { name: 'Azusa Test Playlist' })).toBeVisible();
  });

  test('searches by BVID and can save the result as a playlist', async ({ page }) => {
    await search(page, BVID_SEARCH);

    await expect(page.getByRole('heading', { name: new RegExp(BVID_SEARCH) })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Search Match Song' })).toBeVisible();

    await page.getByTestId('save-search-as-playlist').click();
    const dialog = page.getByRole('dialog');
    await dialog.locator('#fav-name').fill('Playwright Saved Playlist');
    await dialog.getByRole('button').last().click();

    await page.getByRole('button', { name: /Playwright Saved Playlist/ }).click();
    await expect(page.getByRole('heading', { name: 'Playwright Saved Playlist' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Search Match Song' })).toBeVisible();
  });

  test('supports favorite, collection, and series source searches', async ({ page }) => {
    await search(page, FAVORITE_ID);
    await expect(page.getByRole('heading', { name: new RegExp(FAVORITE_ID) })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Favorite Song 1' })).toBeVisible();
    await expect(page.getByTestId('refresh-search-source')).toBeVisible();

    await search(page, COLLECTION_URL);
    await expect(page.getByRole('heading', { name: /6995126/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Collection Song 1' })).toBeVisible();
    await expect(page.getByTestId('refresh-search-source')).toBeVisible();

    await search(page, SERIES_URL);
    await expect(page.getByRole('heading', { name: /828030/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Series Song 1' })).toBeVisible();
  });

  test('shows help and unsupported-input empty state', async ({ page }) => {
    await page.getByTestId('search-help-button').click();
    await expect(page.getByRole('dialog')).toContainText('BVID');
    await expect(page.getByRole('dialog')).toContainText('space.bilibili.com');
    await page.keyboard.press('Escape');

    await search(page, 'not-a-valid-input');

    await expect(page.getByRole('heading', { name: /not-a-valid-input/ })).toBeVisible();
    await expect(page.locator('table[aria-label="fav table"] tbody tr')).toHaveCount(0);
  });

  test('updates the current queue immediately when play mode changes', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear());
    await openPopup(page, {
      state: {
        MyFavList: ['FavList-default'],
        'FavList-default': {
          info: { id: 'FavList-default', title: 'Azusa Test Playlist' },
          songList: [
            { id: '36507159061', bvid: 'BV1yNPbzjEVq', name: 'Default Song', singer: 'Test UP', singerId: '1001', cover: 'cover' },
            { id: '99887766', bvid: BVID_SEARCH, name: 'Search Match Song', singer: 'Search UP', singerId: '1002', cover: 'cover' },
            { id: '22334455', bvid: 'BV1Fv4y1d7AC', name: 'Favorite Song 2', singer: 'Favorite UP 2', singerId: '1004', cover: 'cover' },
          ],
        },
        LastPlayList: [
          { id: '36507159061', bvid: 'BV1yNPbzjEVq', name: 'Default Song', singer: 'Test UP', singerId: '1001', cover: 'cover' },
          { id: '99887766', bvid: BVID_SEARCH, name: 'Search Match Song', singer: 'Search UP', singerId: '1002', cover: 'cover' },
          { id: '22334455', bvid: 'BV1Fv4y1d7AC', name: 'Favorite Song 2', singer: 'Favorite UP 2', singerId: '1004', cover: 'cover' },
        ],
        PlayerSetting: {
          playMode: 'order',
          defaultVolume: 0.5,
          darkMode: false,
          selectedFavId: 'FavList-default',
          lyricFontSize: 16,
        },
      },
      replaceExistingState: true,
    });
    await page.evaluate(() => {
      Math.random = () => 0;
    });
    await expect
      .poll(async () => (await readPlayerState(page)).queue.slice(0, 3))
      .toEqual(['36507159061', '99887766', '22334455']);

    const orderedQueue = (await readPlayerState(page)).queue;

    await cyclePlayModeUntil(page, 'shufflePlay');
    const shuffledQueue = (await readPlayerState(page)).queue;
    expect(shuffledQueue.slice(0, 3)).toEqual(['99887766', '22334455', '36507159061']);

    await cyclePlayModeUntil(page, 'order');
    await expect
      .poll(async () => (await readPlayerState(page)).queue.slice(0, 3))
      .toEqual(orderedQueue.slice(0, 3));
  });

  test('clears stale saved progress data while keeping saved search playlists usable', async ({ page }) => {
    await page.evaluate(() => {
      const localState = JSON.parse(window.localStorage.getItem('azusa-player:local') || '{}');
      localState.SongProgressMap = { '99887766': 120 };
      window.localStorage.setItem('azusa-player:local', JSON.stringify(localState));
    });

    await page.reload();
    await expect
      .poll(async () =>
        page.evaluate(() => Object.prototype.hasOwnProperty.call(JSON.parse(window.localStorage.getItem('azusa-player:local') || '{}'), 'SongProgressMap')),
      )
      .toBe(false);

    await search(page, BVID_SEARCH);
    await page.getByTestId('save-search-as-playlist').click();

    const dialog = page.getByRole('dialog');
    await dialog.locator('#fav-name').fill('Saved Search Queue');
    await dialog.getByRole('button').last().click();

    await page.getByRole('button', { name: /Saved Search Queue/ }).click();
    await expect(page.getByRole('button', { name: 'Search Match Song' })).toBeVisible();
  });
});
