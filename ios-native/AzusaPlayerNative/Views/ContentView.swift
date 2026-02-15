import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var vm: PlayerViewModel
    @State private var showingLyrics = false
    @State private var sliderValue: Double = 0
    @State private var isScrubbing = false

    var body: some View {
        TabView {
            searchTab
                .tabItem { Label("Search", systemImage: "magnifyingglass") }

            favoritesTab
                .tabItem { Label("Favorites", systemImage: "heart") }

            playerTab
                .tabItem { Label("Player", systemImage: "music.note") }
        }
        .tint(Color.red)
    }

    private var searchTab: some View {
        NavigationStack {
            VStack(spacing: 12) {
                TextField("BVID / video URL / fav fid", text: $vm.input)
                    .textFieldStyle(.roundedBorder)
                    .autocapitalization(.none)
                    .disableAutocorrection(true)

                Button {
                    Task { await vm.importSongs() }
                } label: {
                    if vm.isLoading {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                    } else {
                        Text("Import")
                            .frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(.borderedProminent)

                if vm.isLoading {
                    ProgressView(value: vm.importProgress, total: 1.0)
                    Text(vm.importProgressText)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                if let err = vm.error {
                    Text(err).foregroundStyle(.red).font(.footnote)
                }

                List(vm.queue.indices, id: \.self) { idx in
                    let song = vm.queue[idx]
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(song.name).lineLimit(1)
                            Text(song.singer).font(.caption).foregroundStyle(.secondary)
                        }
                        Spacer()
                        Button("Play") { Task { await vm.playFromTap(index: idx) } }
                            .buttonStyle(.borderedProminent)
                        Button("Fav") { vm.addFavorite(song) }
                            .buttonStyle(.bordered)
                    }
                }
                .listStyle(.plain)
            }
            .padding()
            .navigationTitle("Azusa Player")
        }
    }

    private var favoritesTab: some View {
        NavigationStack {
            List(vm.favorites) { song in
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(song.name).lineLimit(1)
                        Text(song.singer).font(.caption).foregroundStyle(.secondary)
                    }
                    Spacer()
                    Button(role: .destructive) {
                        vm.removeFavorite(song.id)
                    } label: {
                        Image(systemName: "trash")
                    }
                }
            }
            .navigationTitle("Favorites")
        }
    }

    private var playerTab: some View {
        ZStack {
            backgroundLayer

            VStack(spacing: 0) {
                Spacer().frame(height: 14)

                HStack {
                    Text(vm.currentSong?.name ?? "Nothing playing")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white)
                        .lineLimit(1)
                    Spacer()
                    Button(showingLyrics ? "封面" : "歌词") {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            showingLyrics.toggle()
                        }
                    }
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.white.opacity(0.88))
                    Text(vm.currentSong?.singer ?? "-")
                        .font(.system(size: 12))
                        .foregroundColor(.white.opacity(0.7))
                }
                .padding(.horizontal, 22)
                .padding(.bottom, 8)

                Group {
                    if showingLyrics {
                        lyricPage
                    } else {
                        coverPage
                    }
                }
                .frame(maxHeight: .infinity)
                .contentShape(Rectangle())
                .onTapGesture {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        showingLyrics.toggle()
                    }
                }

                if vm.isSwitchingSong {
                    VStack(spacing: 6) {
                        ProgressView(value: vm.playProgress, total: 1.0)
                            .tint(Color.white.opacity(0.95))
                        Text(vm.playProgressText)
                            .font(.caption2)
                            .foregroundColor(.white.opacity(0.8))
                    }
                    .padding(.horizontal, 22)
                    .padding(.bottom, 8)
                }

                HStack(spacing: 24) {
                    Button { vm.cycleLoopMode() } label: {
                        Image(systemName: "repeat")
                    }
                    Button { Task { await vm.playPrev() } } label: {
                        Image(systemName: "backward.fill")
                    }
                    .font(.system(size: 18, weight: .medium))

                    Button { vm.togglePlayPause() } label: {
                        Image(systemName: vm.isPlaying ? "pause.circle.fill" : "play.circle.fill")
                            .font(.system(size: 54))
                    }

                    Button { Task { await vm.playNext() } } label: {
                        Image(systemName: "forward.fill")
                    }
                    .font(.system(size: 18, weight: .medium))

                    Image(systemName: "speaker.wave.2.fill")
                }
                .foregroundColor(.white)
                .padding(.bottom, 14)

                VStack(spacing: 6) {
                    Slider(
                        value: Binding(
                            get: { isScrubbing ? sliderValue : vm.currentTime },
                            set: { sliderValue = $0 }
                        ),
                        in: 0...vm.safeDuration,
                        onEditingChanged: { editing in
                            isScrubbing = editing
                            if editing {
                                sliderValue = vm.currentTime
                            } else {
                                vm.seek(to: sliderValue)
                            }
                        }
                    )
                    .tint(Color.red.opacity(0.9))
                    .scaleEffect(x: 1, y: 1.35, anchor: .center)

                    HStack {
                        Text(formatTime(isScrubbing ? sliderValue : vm.currentTime))
                        Spacer()
                        Text(formatTime(vm.safeDuration))
                    }
                    .font(.system(size: 11))
                    .foregroundColor(.white.opacity(0.75))
                }
                .padding(.horizontal, 22)
                .padding(.bottom, 20)
            }
        }
    }

    private func safeCoverURL(_ raw: String) -> URL? {
        if raw.hasPrefix("http://") {
            return URL(string: raw.replacingOccurrences(of: "http://", with: "https://"))
        }
        return URL(string: raw)
    }

    private var backgroundLayer: some View {
        ZStack {
            AsyncImage(url: safeCoverURL(vm.currentSong?.cover ?? "")) { image in
                image.resizable().scaledToFill()
            } placeholder: {
                LinearGradient(
                    colors: [Color(red: 0.12, green: 0.13, blue: 0.14), Color(red: 0.18, green: 0.17, blue: 0.16)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            }
            .blur(radius: 28)
            .overlay(Color.black.opacity(0.45))
            .ignoresSafeArea()
        }
    }

    private var coverPage: some View {
        VStack(spacing: 18) {
            ZStack {
                Circle()
                    .fill(Color.black.opacity(0.35))
                    .frame(width: 290, height: 290)
                    .overlay(Circle().stroke(Color.white.opacity(0.08), lineWidth: 1))

                AsyncImage(url: safeCoverURL(vm.currentSong?.cover ?? "")) { image in
                    image.resizable().scaledToFill()
                } placeholder: {
                    Circle().fill(Color.gray.opacity(0.35))
                }
                .frame(width: 222, height: 222)
                .clipShape(Circle())
            }
            .shadow(color: Color.black.opacity(0.35), radius: 22, x: 0, y: 12)
        }
    }

    private var lyricPage: some View {
        ScrollView {
            Text(normalizedLyricText(vm.lyric))
                .font(.system(size: 16, weight: .regular))
                .foregroundColor(.white.opacity(0.92))
                .lineSpacing(10)
                .multilineTextAlignment(.leading)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(20)
                .background(Color.black.opacity(0.25))
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .padding(.horizontal, 18)
        }
    }

    private func formatTime(_ sec: Double) -> String {
        guard sec.isFinite && sec > 0 else { return "00:00" }
        let total = Int(sec)
        let m = total / 60
        let s = total % 60
        return String(format: "%02d:%02d", m, s)
    }

    private func normalizedLyricText(_ text: String) -> String {
        let t = text.trimmingCharacters(in: .whitespacesAndNewlines)
        if t.isEmpty {
            return "暂无歌词"
        }
        return t
    }
}
