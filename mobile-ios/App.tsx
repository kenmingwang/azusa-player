import { StatusBar } from "expo-status-bar";
import { Audio, AVPlaybackStatus } from "expo-av";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { fetchFavSongs, fetchPlayUrl, fetchSongsByBvid } from "./src/services/bilibili";
import { fetchLrcByName, fetchLyricByMid, searchLyricCandidates } from "./src/services/lyrics";
import { loadFavorites, loadLyric, loadSettings, saveFavorites, saveLyric } from "./src/storage/storage";
import { Playlist, PlayerSettings, Song } from "./src/types";
import { parseFavMediaId } from "./src/utils/parse";

type Tab = "search" | "library" | "player";

export default function App() {
  const [tab, setTab] = useState<Tab>("search");
  const [input, setInput] = useState("");
  const [queue, setQueue] = useState<Song[]>([]);
  const [favorites, setFavorites] = useState<Playlist>({ id: "default", title: "My Favorites", songs: [] });
  const [settings, setSettings] = useState<PlayerSettings>({ volume: 1, loopMode: "order" });
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [lyric, setLyric] = useState("[00:00.000] No lyric");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const soundRef = useRef<Audio.Sound | null>(null);

  const currentSong = useMemo(() => {
    if (currentIndex < 0 || currentIndex >= queue.length) return null;
    return queue[currentIndex];
  }, [currentIndex, queue]);

  useEffect(() => {
    (async () => {
      const [storedFav, storedSettings] = await Promise.all([loadFavorites(), loadSettings()]);
      setFavorites(storedFav);
      setSettings(storedSettings);
      await Audio.setAudioModeAsync({
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
      });
    })();

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    if (!currentSong) return;

    (async () => {
      const cached = await loadLyric(currentSong.id);
      if (cached) {
        setLyric(cached);
        return;
      }

      const lrc = await fetchLrcByName(currentSong.name);
      if (lrc) {
        setLyric(lrc);
        await saveLyric(currentSong.id, lrc);
      } else {
        const candidates = await searchLyricCandidates(currentSong.name);
        if (candidates.length > 0) {
          const qqLrc = await fetchLyricByMid(candidates[0].mid);
          if (qqLrc) {
            setLyric(qqLrc);
            await saveLyric(currentSong.id, qqLrc);
            return;
          }
        }
        setLyric("[00:00.000] Lyric not found");
      }
    })();
  }, [currentSong]);

  const onPlaybackStatus = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setPosition(status.positionMillis || 0);
    setDuration(status.durationMillis || 0);
    setIsPlaying(status.isPlaying);

    if (status.didJustFinish) {
      if (settings.loopMode === "singleLoop") {
        void playSongAt(currentIndex);
      } else {
        void playNext();
      }
    }
  };

  const ensurePlayableSong = async (song: Song): Promise<Song> => {
    if (song.musicSrc) return song;
    const src = await fetchPlayUrl(song.bvid, song.cid);
    return { ...song, musicSrc: src };
  };

  const playSongAt = async (index: number) => {
    if (index < 0 || index >= queue.length) return;
    setError(null);

    const targetSong = await ensurePlayableSong(queue[index]);
    const newQueue = [...queue];
    newQueue[index] = targetSong;
    setQueue(newQueue);

    if (soundRef.current) {
      await soundRef.current.unloadAsync();
    }

    const { sound } = await Audio.Sound.createAsync(
      { uri: targetSong.musicSrc },
      { shouldPlay: true, volume: settings.volume },
      onPlaybackStatus,
    );

    soundRef.current = sound;
    setCurrentIndex(index);
    setIsPlaying(true);
    setTab("player");
  };

  const togglePlayPause = async () => {
    if (!soundRef.current) return;
    const status = await soundRef.current.getStatusAsync();
    if (!status.isLoaded) return;

    if (status.isPlaying) {
      await soundRef.current.pauseAsync();
      setIsPlaying(false);
    } else {
      await soundRef.current.playAsync();
      setIsPlaying(true);
    }
  };

  const playNext = async () => {
    if (queue.length === 0) return;

    if (settings.loopMode === "shuffle") {
      const randomIndex = Math.floor(Math.random() * queue.length);
      await playSongAt(randomIndex);
      return;
    }

    const next = currentIndex + 1;
    if (next < queue.length) {
      await playSongAt(next);
    } else {
      setIsPlaying(false);
    }
  };

  const playPrev = async () => {
    if (queue.length === 0) return;
    const prev = Math.max(0, currentIndex - 1);
    await playSongAt(prev);
  };

  const importSongs = async () => {
    setLoading(true);
    setError(null);

    try {
      const favId = parseFavMediaId(input);
      const songs = favId ? await fetchFavSongs(favId) : await fetchSongsByBvid(input);

      if (!songs.length) {
        throw new Error("No songs parsed from this input.");
      }

      setQueue((prev) => [...prev, ...songs]);
      if (currentIndex === -1) {
        const startIndex = queue.length;
        setCurrentIndex(startIndex);
        const merged = [...queue, ...songs];
        setQueue(merged);
        await playSongAt(startIndex);
      }
      setInput("");
    } catch (e: any) {
      setError(e?.message || "Import failed");
    } finally {
      setLoading(false);
    }
  };

  const addToFavorites = async (song: Song) => {
    if (favorites.songs.some((s) => s.id === song.id)) return;
    const next = { ...favorites, songs: [song, ...favorites.songs] };
    setFavorites(next);
    await saveFavorites(next);
  };

  const removeFromFavorites = async (songId: string) => {
    const next = { ...favorites, songs: favorites.songs.filter((s) => s.id !== songId) };
    setFavorites(next);
    await saveFavorites(next);
  };

  const setLoopMode = async () => {
    const order: PlayerSettings["loopMode"][] = ["order", "singleLoop", "shuffle"];
    const idx = order.indexOf(settings.loopMode);
    const next = { ...settings, loopMode: order[(idx + 1) % order.length] };
    setSettings(next);
  };

  const SongRow = ({ item, onDelete }: { item: Song; onDelete?: boolean }) => (
    <View style={styles.songRow}>
      <Pressable style={styles.songMain} onPress={() => void playSongAt(queue.findIndex((s) => s.id === item.id))}>
        <Text numberOfLines={1} style={styles.songTitle}>
          {item.name}
        </Text>
        <Text numberOfLines={1} style={styles.songArtist}>
          {item.singer}
        </Text>
      </Pressable>
      <Pressable onPress={() => (onDelete ? void removeFromFavorites(item.id) : void addToFavorites(item))}>
        <Text style={styles.smallAction}>{onDelete ? "Remove" : "Fav"}</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Text style={styles.brand}>Azusa Player</Text>
        <Text style={styles.brandSub}>Bilibili iOS Migration</Text>
      </View>

      <View style={styles.tabs}>
        {(["search", "library", "player"] as Tab[]).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>

      {tab === "search" && (
        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Import from Bilibili</Text>
          <TextInput
            value={input}
            onChangeText={setInput}
            style={styles.input}
            placeholder="Paste BVID/video URL or fav media id/fid URL"
            placeholderTextColor="#8d8d8d"
          />
          <Pressable style={styles.primaryButton} onPress={() => void importSongs()}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Import</Text>}
          </Pressable>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.sectionTitle}>Queue</Text>
          <FlatList
            data={queue}
            keyExtractor={(item, idx) => `${item.id}-${idx}`}
            renderItem={({ item }) => <SongRow item={item} />}
          />
        </View>
      )}

      {tab === "library" && (
        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>{favorites.title}</Text>
          <FlatList
            data={favorites.songs}
            keyExtractor={(item, idx) => `${item.id}-${idx}`}
            renderItem={({ item }) => <SongRow item={item} onDelete />}
            ListEmptyComponent={<Text style={styles.tip}>No favorites yet.</Text>}
          />
        </View>
      )}

      {tab === "player" && (
        <View style={styles.panel}>
          <View style={styles.playerCard}>
            {currentSong?.cover ? <Image source={{ uri: currentSong.cover }} style={styles.cover} /> : <View style={styles.cover} />}
            <Text style={styles.nowTitle}>{currentSong?.name || "Nothing playing"}</Text>
            <Text style={styles.nowArtist}>{currentSong?.singer || "-"}</Text>
            <Text style={styles.timeText}>
              {Math.floor(position / 1000)}s / {Math.floor(duration / 1000)}s
            </Text>

            <View style={styles.controls}>
              <Pressable onPress={() => void playPrev()} style={styles.ctrlBtn}>
                <Text style={styles.ctrlText}>Prev</Text>
              </Pressable>
              <Pressable onPress={() => void togglePlayPause()} style={[styles.ctrlBtn, styles.ctrlPrimary]}>
                <Text style={styles.ctrlPrimaryText}>{isPlaying ? "Pause" : "Play"}</Text>
              </Pressable>
              <Pressable onPress={() => void playNext()} style={styles.ctrlBtn}>
                <Text style={styles.ctrlText}>Next</Text>
              </Pressable>
            </View>

            <Pressable onPress={() => void setLoopMode()}>
              <Text style={styles.loopMode}>Mode: {settings.loopMode}</Text>
            </Pressable>
          </View>

          <Text style={styles.sectionTitle}>Lyrics</Text>
          <ScrollView style={styles.lyricBox}>
            <Text style={styles.lyricText}>{lyric}</Text>
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f6f3ef" },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  brand: { fontSize: 28, fontWeight: "700", color: "#1b1b1b" },
  brandSub: { fontSize: 12, color: "#666" },
  tabs: { flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingBottom: 8 },
  tab: { flex: 1, borderRadius: 20, paddingVertical: 10, backgroundColor: "#ebe7e1", alignItems: "center" },
  tabActive: { backgroundColor: "#c20c0c" },
  tabText: { color: "#545454", fontWeight: "600", fontSize: 12 },
  tabTextActive: { color: "#fff" },
  panel: { flex: 1, paddingHorizontal: 12, paddingBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1f1f1f", marginVertical: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd4ca",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#111",
  },
  primaryButton: {
    marginTop: 10,
    backgroundColor: "#c20c0c",
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonText: { color: "#fff", fontWeight: "700" },
  error: { color: "#b00020", marginTop: 8 },
  tip: { color: "#666", marginTop: 8 },
  songRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  songMain: { flex: 1, paddingRight: 8 },
  songTitle: { fontSize: 14, color: "#202020", fontWeight: "600" },
  songArtist: { fontSize: 12, color: "#666", marginTop: 2 },
  smallAction: { color: "#c20c0c", fontWeight: "700", paddingHorizontal: 8 },
  playerCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ece3d8",
  },
  cover: { width: 220, height: 220, borderRadius: 16, backgroundColor: "#ded5ca" },
  nowTitle: { marginTop: 12, fontSize: 18, fontWeight: "700", color: "#191919" },
  nowArtist: { marginTop: 4, fontSize: 13, color: "#666" },
  timeText: { marginTop: 8, fontSize: 12, color: "#888" },
  controls: { flexDirection: "row", gap: 8, marginTop: 12 },
  ctrlBtn: {
    backgroundColor: "#ece7e0",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  ctrlPrimary: { backgroundColor: "#c20c0c" },
  ctrlText: { color: "#333", fontWeight: "600" },
  ctrlPrimaryText: { color: "#fff", fontWeight: "700" },
  loopMode: { marginTop: 10, color: "#5a5a5a", fontSize: 12 },
  lyricBox: {
    marginTop: 8,
    backgroundColor: "#faf7f2",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e8dfd4",
    padding: 12,
  },
  lyricText: { color: "#2c2c2c", lineHeight: 22, fontSize: 14 },
});
