# Azusa Player iOS (Migration Scaffold)

This folder contains a React Native (Expo) iOS app scaffold migrated from the Chrome extension.

## Included features

- Play / pause / previous / next
- Current queue (music list)
- Favorites playlist (local, persisted)
- Lyrics panel (auto fetch + search fallback ready)
- Import from Bilibili video (`BV...`) and Bilibili favorite list URL

## Tech mapping from extension

- `chrome.storage.local` -> `AsyncStorage`
- `fetchPlayUrlPromise` -> `fetchPlayUrl`
- `fetchVideoInfo` / `fetchFavList` -> mobile services in `src/services/bilibili.ts`
- lyric APIs -> `src/services/lyrics.ts`

## Run

```bash
cd mobile-ios
npm install
npm run ios
```

## Notes

- This is a migration baseline focused on feature parity.
- Before App Store release, add login/session support if Bilibili APIs require auth for some lists.
- Add background audio / lockscreen controls in a later step (recommend `react-native-track-player`).
