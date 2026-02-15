import Foundation
import AVFoundation

@MainActor
final class PlayerViewModel: ObservableObject {
    private static let mediaRequestHeaders: [String: String] = [
        "Referer": "https://www.bilibili.com",
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
        "Accept": "*/*"
    ]

    @Published var queue: [Song] = []
    @Published var favorites: [Song] = []
    @Published var currentIndex: Int = -1
    @Published var isPlaying = false
    @Published var currentTime: Double = 0
    @Published var duration: Double = 0
    @Published var lyric: String = "[00:00.000] No lyric"
    @Published var input: String = ""
    @Published var isLoading = false
    @Published var importProgress: Double = 0
    @Published var importProgressText: String = ""
    @Published var isSwitchingSong = false
    @Published var playProgress: Double = 0
    @Published var playProgressText: String = ""
    @Published var error: String?
    @Published var settings = PlayerSettings()

    private var player: AVPlayer?
    private var timeObserver: Any?
    private var itemStatusObservation: NSKeyValueObservation?
    private var playbackObservers: [NSObjectProtocol] = []

    var currentSong: Song? {
        guard currentIndex >= 0, currentIndex < queue.count else { return nil }
        return queue[currentIndex]
    }

    var safeDuration: Double {
        if duration.isFinite && duration > 0 { return duration }
        return 1
    }

    init() {
        favorites = StorageService.loadFavorites()
        settings = StorageService.loadSettings()
        configureAudioSession()
    }

    deinit {
        if let timeObserver, let player {
            player.removeTimeObserver(timeObserver)
        }
        for observer in playbackObservers {
            NotificationCenter.default.removeObserver(observer)
        }
    }

    func importSongs() async {
        isLoading = true
        importProgress = 0
        importProgressText = "Starting import..."
        error = nil
        AppLogger.info("importSongs start input=\(input)")
        defer {
            isLoading = false
            if importProgress >= 1 {
                importProgressText = "Import complete"
            }
        }

        do {
            let newSongs = try await BilibiliService.fetchSongs(input: input) { [weak self] p in
                Task { @MainActor in
                    guard let self else { return }
                    self.importProgress = Double(p.completed) / Double(max(1, p.total))
                    self.importProgressText = p.message
                }
            }
            guard !newSongs.isEmpty else {
                error = "No songs parsed from this input"
                AppLogger.error("importSongs returned empty")
                return
            }
            let start = queue.count
            queue += newSongs
            importProgress = 1
            importProgressText = "Import complete"
            AppLogger.info("importSongs success added=\(newSongs.count) queue=\(queue.count)")
            input = ""
            if currentIndex == -1 {
                try await play(index: start)
            }
        } catch {
            self.error = error.localizedDescription
            AppLogger.error("importSongs error=\(error.localizedDescription)")
        }
    }

    func playFromTap(index: Int) async {
        AppLogger.info("playFromTap idx=\(index)")
        isSwitchingSong = true
        playProgress = 0.05
        playProgressText = "Preparing song..."
        do {
            try await play(index: index)
            playProgress = 1
            playProgressText = "Playback started"
        } catch {
            if index >= 0, index < queue.count {
                queue[index].musicSrc = ""
            }
            self.error = error.localizedDescription
            AppLogger.error("playFromTap error=\(error.localizedDescription)")
            playProgressText = "Playback failed"
        }
        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 700_000_000)
            self.isSwitchingSong = false
            self.playProgress = 0
        }
    }

    func play(index: Int) async throws {
        guard index >= 0 && index < queue.count else {
            AppLogger.error("play invalid index=\(index) queue=\(queue.count)")
            return
        }

        var song = queue[index]
        AppLogger.info("play start idx=\(index) name=\(song.name) bvid=\(song.bvid) cid=\(song.cid)")

        do {
            playProgress = 0.25
            playProgressText = "Fetching stream URL..."
            let src = try await BilibiliService.fetchPlayURL(bvid: song.bvid, cid: song.cid)
            song.musicSrc = src
            queue[index] = song
            AppLogger.info("play fetched musicSrc length=\(src.count)")
        } catch {
            if song.musicSrc.isEmpty {
                throw error
            }
            AppLogger.error("play fetchPlayURL failed; retrying with cached src. err=\(error.localizedDescription)")
        }

        guard let url = URL(string: song.musicSrc) else {
            throw NSError(domain: "Azusa", code: 3, userInfo: [NSLocalizedDescriptionKey: "Invalid audio URL"])
        }

        let asset = AVURLAsset(
            url: url,
            options: ["AVURLAssetHTTPHeaderFieldsKey": Self.mediaRequestHeaders]
        )
        let item = AVPlayerItem(asset: asset)
        playProgress = 0.6
        playProgressText = "Creating player item..."
        if let oldObserver = timeObserver, let player {
            player.removeTimeObserver(oldObserver)
            timeObserver = nil
        }

        itemStatusObservation = nil
        for observer in playbackObservers {
            NotificationCenter.default.removeObserver(observer)
        }
        playbackObservers.removeAll()

        player = AVPlayer(playerItem: item)
        player?.automaticallyWaitsToMinimizeStalling = true
        currentIndex = index
        player?.play()
        isPlaying = true
        playProgress = 0.8
        playProgressText = "Buffering..."

        itemStatusObservation = item.observe(\.status, options: [.new]) { [weak self] item, _ in
            guard let self else { return }
            Task { @MainActor in
                switch item.status {
                case .readyToPlay:
                    AppLogger.info("player item readyToPlay idx=\(index)")
                    let d = item.duration.seconds
                    if d.isFinite && d > 0 {
                        self.duration = d
                    }
                    self.playProgress = 1
                    self.playProgressText = "Playing"
                case .failed:
                    let msg = item.error?.localizedDescription ?? "unknown item error"
                    AppLogger.error("player item failed idx=\(index), err=\(msg)")
                    self.error = "Player item failed: \(msg)"
                    self.isSwitchingSong = false
                default:
                    AppLogger.info("player item status=\(item.status.rawValue) idx=\(index)")
                }
            }
        }

        timeObserver = player?.addPeriodicTimeObserver(forInterval: CMTime(seconds: 0.5, preferredTimescale: 600), queue: .main) { [weak self] time in
            guard let self else { return }
            let sec = CMTimeGetSeconds(time)
            if sec.isFinite && sec >= 0 {
                self.currentTime = sec
            }
            if let d = self.player?.currentItem?.duration.seconds, d.isFinite && d > 0 {
                self.duration = d
            }
        }

        let ended = NotificationCenter.default.addObserver(forName: .AVPlayerItemDidPlayToEndTime, object: item, queue: .main) { [weak self] _ in
            AppLogger.info("player did finish item")
            Task { await self?.onEnded() }
        }

        let failed = NotificationCenter.default.addObserver(forName: .AVPlayerItemFailedToPlayToEndTime, object: item, queue: .main) { [weak self] notification in
            let nsError = notification.userInfo?[AVPlayerItemFailedToPlayToEndTimeErrorKey] as? NSError
            let message = nsError?.localizedDescription ?? "Unknown playback failure"
            AppLogger.error("player failed to play to end: \(message)")
            self?.error = "Playback failed: \(message)"
            self?.isPlaying = false
            guard let self, self.currentIndex >= 0, self.currentIndex < self.queue.count else { return }
            self.queue[self.currentIndex].musicSrc = ""
            AppLogger.info("cleared cached musicSrc for idx=\(self.currentIndex) due to playback failure")
        }

        let stalled = NotificationCenter.default.addObserver(forName: .AVPlayerItemPlaybackStalled, object: item, queue: .main) { [weak self] _ in
            AppLogger.error("player playback stalled")
            self?.error = "Playback stalled. Please retry."
        }

        playbackObservers = [ended, failed, stalled]

        await loadLyric(song: song)
    }

    func togglePlayPause() {
        guard let player else {
            AppLogger.error("togglePlayPause called without player")
            return
        }
        if isPlaying {
            player.pause()
            AppLogger.info("player paused")
        } else {
            player.play()
            AppLogger.info("player resumed")
        }
        isPlaying.toggle()
    }

    func seek(to seconds: Double) {
        guard let player else { return }
        let maxDuration = safeDuration
        let target = min(max(0, seconds), maxDuration)
        let cm = CMTime(seconds: target, preferredTimescale: 600)
        player.seek(to: cm)
        currentTime = target
        AppLogger.info("seek to seconds=\(Int(target))")
    }

    func playNext() async {
        guard !queue.isEmpty else { return }
        switch settings.loopMode {
        case .shuffle:
            let idx = Int.random(in: 0..<queue.count)
            await playFromTap(index: idx)
        case .singleLoop:
            if currentIndex >= 0 { await playFromTap(index: currentIndex) }
        case .order:
            let next = currentIndex + 1
            if next < queue.count {
                await playFromTap(index: next)
            } else {
                isPlaying = false
            }
        }
    }

    func playPrev() async {
        guard !queue.isEmpty else { return }
        let prev = max(0, currentIndex - 1)
        await playFromTap(index: prev)
    }

    func cycleLoopMode() {
        switch settings.loopMode {
        case .order:
            settings.loopMode = .singleLoop
        case .singleLoop:
            settings.loopMode = .shuffle
        case .shuffle:
            settings.loopMode = .order
        }
        StorageService.saveSettings(settings)
        AppLogger.info("loop mode changed to \(settings.loopMode.rawValue)")
    }

    func addFavorite(_ song: Song) {
        guard !favorites.contains(where: { $0.id == song.id }) else { return }
        favorites.insert(song, at: 0)
        StorageService.saveFavorites(favorites)
        AppLogger.info("favorite added id=\(song.id)")
    }

    func removeFavorite(_ songID: String) {
        favorites.removeAll { $0.id == songID }
        StorageService.saveFavorites(favorites)
        AppLogger.info("favorite removed id=\(songID)")
    }

    private func loadLyric(song: Song) async {
        let cached = StorageService.loadLyricMap()[song.id]
        if let cached {
            lyric = cached
            AppLogger.info("lyric loaded from cache songID=\(song.id)")
            return
        }

        let fetched = await LyricService.fetchLyric(songName: song.name)
        lyric = fetched
        StorageService.saveLyric(songID: song.id, lyric: fetched)
        AppLogger.info("lyric fetched remotely songID=\(song.id)")
    }

    private func onEnded() async {
        await playNext()
    }

    private func configureAudioSession() {
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [])
            try AVAudioSession.sharedInstance().setActive(true)
            AppLogger.info("audio session configured")
        } catch {
            AppLogger.error("audio session configuration failed: \(error.localizedDescription)")
        }
    }
}
