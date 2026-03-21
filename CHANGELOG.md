# Changelog

## 2026-03-21

### TS Migration & Refactor
- Migrate popup and component layers from JS to TS/TSX.
- Replace broken/garbled JSX strings that caused parser/build instability.
- Refactor data/storage/model modules into typed TS files.
- Remove all `// @ts-nocheck` and keep strict mode compile passing.

### Issue Fixes
- #65 Memory leak / long-run crash
  - Revoke object URLs after export/download.
  - Clean runtime listeners on unmount.
- #64 APM playback quality issue
  - Improve audio stream selection logic to prefer higher quality `dash.audio` sources.
- #63 Playlist sync between browser/mobile
  - Add cloud mirror with `chrome.storage.sync` and restore-on-empty bootstrap.
- #59 / #60 Fav list last page missing
  - Remove wrong last-page short-circuit (`has_more`) and always parse all pages.
- #57 / #58 season list not searchable
  - Add support for `space.bilibili.com/{uid}/lists/{sid}?type=season`.
- #49 Keyboard shortcuts
  - Add play/pause, volume, seek, previous/next shortcuts.
- #48 Lyric garbled text
  - Add lyric text normalization and mojibake fallback decode.
- #45 Top action buttons too small
  - Increase icon sizes and improve interaction area.
- #44 / #12 Batch operations on favorite list
  - Add batch add-to-playlist, batch add-to-fav, batch delete.
- #43 Manual song rename
  - Add in-table rename action.
- #41 Cannot click bottom item when fav list is long
  - Add capped-height selectable menu with scroll.
- #34 Random algorithm improvement
  - Use cycle-oriented shuffle strategy to avoid immediate repeats.
- #7 Save playback progress
  - Persist and restore per-song playback position.
- #3 Playlist name edit
  - Add playlist rename workflow.

### Non-code / informational issues
- #61, #51, #29 are non-defect or product-direction discussions.
- #36 Desktop lyric overlay requires separate product capability (desktop/pinned window) beyond current extension scope.

### Tests
- Add Vitest test setup and scripts.
- Add utility tests:
  - `tests/data-utils.test.ts`
  - `tests/re-utils.test.ts`
