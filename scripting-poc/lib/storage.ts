import { Storage } from "scripting";

import type { PersistedState, Track } from "./types";

const STATE_KEY = "azusa.scripting.poc.state";
const DOWNLOADS_KEY = "azusa.scripting.poc.downloads";

type DownloadIndex = Record<string, string>;

const defaultState: PersistedState = {
  lastInput: "",
  queue: [],
};

export function loadState(): PersistedState {
  return (Storage.get(STATE_KEY) as PersistedState | null) ?? defaultState;
}

export function saveState(nextState: PersistedState) {
  Storage.set(STATE_KEY, nextState);
}

export function loadDownloads(): DownloadIndex {
  return (Storage.get(DOWNLOADS_KEY) as DownloadIndex | null) ?? {};
}

export function attachDownloadedPaths(tracks: Track[]) {
  const downloads = loadDownloads();
  return tracks.map((track) => ({
    ...track,
    localFilePath: downloads[track.id] ?? track.localFilePath,
  }));
}

export function rememberDownload(trackId: string, localFilePath: string) {
  const current = loadDownloads();
  current[trackId] = localFilePath;
  Storage.set(DOWNLOADS_KEY, current);
}
