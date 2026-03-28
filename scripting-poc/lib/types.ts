export type PlaybackUiState =
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "error";

export type Track = {
  id: string;
  bvid: string;
  cid: string;
  title: string;
  artist: string;
  sourceTitle: string;
  cover?: string;
  streamUrl?: string;
  backupStreamUrls?: string[];
  localFilePath?: string;
  durationSeconds?: number;
};

export type ImportResult = {
  sourceTitle: string;
  ownerName: string;
  cover?: string;
  tracks: Track[];
};

export type PersistedState = {
  lastInput: string;
  sourceTitle?: string;
  queue: Track[];
  currentTrackId?: string;
};
