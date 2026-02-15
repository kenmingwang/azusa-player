# Azusa Player Native iOS (Xcode)

Pure native SwiftUI iOS app that runs in Xcode iPhone Simulator.

## Open in Xcode

- Open `/Users/kenmingwang/Documents/repo/js/azusa-player/ios-native/AzusaPlayerNative/AzusaPlayerNative.xcodeproj`
- Select scheme `AzusaPlayerNative`
- Select an iPhone simulator (e.g. iPhone 16)
- Run

## CLI build verification

```bash
xcodebuild \
  -project /Users/kenmingwang/Documents/repo/js/azusa-player/ios-native/AzusaPlayerNative/AzusaPlayerNative.xcodeproj \
  -scheme AzusaPlayerNative \
  -configuration Debug \
  -destination 'generic/platform=iOS Simulator' \
  build
```

## Feature parity baseline

- Play / pause / next / prev
- Queue list
- Favorites list (UserDefaults persistence)
- Lyrics fetch (GitHub mapping + QQ fallback)
- Import from Bilibili video BVID/URL
- Import from Bilibili favorites `fid`/media id

## Notes

- This is native iOS baseline architecture for migration.
- For production: add lock-screen controls/background audio handling enhancements and robust error/retry for API rate limits.
