import Foundation

enum StorageService {
    private static let favoritesKey = "azusa.native.favorites"
    private static let settingsKey = "azusa.native.settings"
    private static let lyricsKey = "azusa.native.lyrics"

    static func loadFavorites() -> [Song] {
        guard let data = UserDefaults.standard.data(forKey: favoritesKey) else { return [] }
        return (try? JSONDecoder().decode([Song].self, from: data)) ?? []
    }

    static func saveFavorites(_ songs: [Song]) {
        if let data = try? JSONEncoder().encode(songs) {
            UserDefaults.standard.set(data, forKey: favoritesKey)
        }
    }

    static func loadSettings() -> PlayerSettings {
        guard let data = UserDefaults.standard.data(forKey: settingsKey) else { return PlayerSettings() }
        return (try? JSONDecoder().decode(PlayerSettings.self, from: data)) ?? PlayerSettings()
    }

    static func saveSettings(_ settings: PlayerSettings) {
        if let data = try? JSONEncoder().encode(settings) {
            UserDefaults.standard.set(data, forKey: settingsKey)
        }
    }

    static func loadLyricMap() -> [String: String] {
        guard let data = UserDefaults.standard.data(forKey: lyricsKey) else { return [:] }
        return (try? JSONDecoder().decode([String: String].self, from: data)) ?? [:]
    }

    static func saveLyric(songID: String, lyric: String) {
        var map = loadLyricMap()
        map[songID] = lyric
        if let data = try? JSONEncoder().encode(map) {
            UserDefaults.standard.set(data, forKey: lyricsKey)
        }
    }
}
