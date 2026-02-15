import AsyncStorage from "@react-native-async-storage/async-storage";
import { Playlist, PlayerSettings } from "../types";

const KEYS = {
  favorites: "azusa:favorites",
  settings: "azusa:settings",
  lyrics: "azusa:lyrics",
};

const DEFAULT_SETTINGS: PlayerSettings = {
  volume: 1,
  loopMode: "order",
};

export const loadFavorites = async (): Promise<Playlist> => {
  const raw = await AsyncStorage.getItem(KEYS.favorites);
  if (!raw) {
    return { id: "default", title: "My Favorites", songs: [] };
  }
  return JSON.parse(raw) as Playlist;
};

export const saveFavorites = async (playlist: Playlist) => {
  await AsyncStorage.setItem(KEYS.favorites, JSON.stringify(playlist));
};

export const loadSettings = async (): Promise<PlayerSettings> => {
  const raw = await AsyncStorage.getItem(KEYS.settings);
  if (!raw) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as PlayerSettings) };
};

export const saveSettings = async (settings: PlayerSettings) => {
  await AsyncStorage.setItem(KEYS.settings, JSON.stringify(settings));
};

export const saveLyric = async (songId: string, lrc: string) => {
  const raw = (await AsyncStorage.getItem(KEYS.lyrics)) ?? "{}";
  const map = JSON.parse(raw) as Record<string, string>;
  map[songId] = lrc;
  await AsyncStorage.setItem(KEYS.lyrics, JSON.stringify(map));
};

export const loadLyric = async (songId: string): Promise<string | null> => {
  const raw = (await AsyncStorage.getItem(KEYS.lyrics)) ?? "{}";
  const map = JSON.parse(raw) as Record<string, string>;
  return map[songId] ?? null;
};
