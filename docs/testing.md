# Testing

Azusa Player now uses three testing layers:

- `npm run test:run`
  Runs the default Vitest regression suite for data utilities, storage flows, and popup components.
- `npm run test:e2e`
  Runs Playwright popup end-to-end tests against the Vite-served popup page with mocked Bilibili and QQ APIs.
- `npm run test:live`
  Runs the live network snapshot checks only. This is intentionally separated from PR gating so normal CI stays deterministic.

## Local Workflow

Use the fast regression suite while iterating on logic or UI state:

```bash
npm run test:run
```

Use the browser suite when you touch popup flows such as search, playlist persistence, or theme state:

```bash
npm run test:e2e
```

If Chromium is not installed yet for Playwright, run:

```bash
npx playwright install chromium
```

## E2E Design

- Playwright serves `src/popup/index.html` through Vite instead of relying on `build:web`.
- Browser tests seed `localStorage` using the web fallback in `src/platform/browserApi.ts`.
- Bilibili and QQ requests are mocked in `tests/e2e/helpers/popup-fixtures.ts`, so PR runs do not depend on CORS or external API stability.
- Playwright artifacts are stored under `output/playwright/`.

## Live Regression

The live suite keeps a thin real-network signal for upstream API drift. It is wired into a dedicated GitHub Actions workflow and should only be used for scheduled checks or manual verification:

```bash
npm run test:live
```

## Playwright Skill

The repository Playwright tests are the official CI layer. The Codex `playwright` skill is still useful for manual debugging, snapshots, and reproducing UI issues quickly. A typical local debug loop looks like:

```bash
npx --package @playwright/cli playwright-cli open http://127.0.0.1:4173/src/popup/index.html
npx --package @playwright/cli playwright-cli snapshot
```
