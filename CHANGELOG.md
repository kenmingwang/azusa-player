# Changelog

## 2026-09-22

### Audio quality & local downloads
- Audio quality is now resolved per page (分 P) and shown as a badge in every playlist / search row (192K / 132K / 64K / 杜比 / 无损), with codec + bitrate in the tooltip.
- Always request the highest usable audio: `playurl` upgrades to `qn=127&fnval=4048&fourk=1`, tries the credentialed request first (logged-in accounts get 192K / Dolby / Hi-Res FLAC), falls back to the anonymous request and finally to the legacy `qn=64&fnval=16` request.
- Dash stream picking now covers `dash.audio`, `dash.dolby.audio` and `dash.flac.audio`, ranked 无损 > 杜比 > 192K > 132K > 64K.
- Per-row "download to local" icon and a toolbar "批量下载(n)" button download the selected songs sequentially with progress/notice feedback, choosing the right container (`.m4a` / `.flac` / `.eac3`).
- The player's own download button now saves the resolved best-quality stream with the correct extension instead of a hardcoded `.mp3`.
- Quality lookups are memoised in memory + `storage.local` and queued (3 concurrent probes) so long playlists do not flood the API.

### New playlist in one click
- The "添加到歌单" dialog gains a "即刻新建歌单并添加" action: name the playlist and the selected songs are created and inserted in a single step (keeps the original `source` so "刷新来源" still works). Handy right after parsing a multipart B 站 video and selecting all its pages.

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
