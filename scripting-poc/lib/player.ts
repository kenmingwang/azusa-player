import {
  AVPlayer,
  FileManager,
  MediaPlayer,
  SharedAudioSession,
  TimeControlStatus,
} from "scripting";

import { resolveTrackStream } from "./api";
import type { PlaybackUiState, Track } from "./types";

type PlayerBindings = {
  onQueueChange?: (queue: Track[]) => void;
  onCurrentTrackChange?: (track: Track | null, index: number) => void;
  onStateChange?: (state: PlaybackUiState, detail?: string) => void;
  onError?: (message: string) => void;
};

const mapStatus = (status: any): PlaybackUiState => {
  switch (status) {
    case TimeControlStatus.playing:
      return "playing";
    case TimeControlStatus.waitingToPlayAtSpecifiedRate:
      return "loading";
    case TimeControlStatus.paused:
    default:
      return "paused";
  }
};

class AzusaScriptingPlayer {
  private readonly player = new AVPlayer();
  private queue: Track[] = [];
  private currentIndex = -1;
  private bindings: PlayerBindings = {};
  private updateTimer?: number;
  private loadToken = 0;

  constructor() {
    this.player.onTimeControlStatusChanged = (status) => {
      this.emitState(mapStatus(status));
      this.updateNowPlaying();
    };

    this.player.onEnded = () => {
      void this.skip(1);
    };

    this.player.onError = (message) => {
      this.emitState("error", message);
      this.bindings.onError?.(message);
    };

    MediaPlayer.setAvailableCommands([
      "play",
      "pause",
      "nextTrack",
      "previousTrack",
    ]);
    MediaPlayer.commandHandler = (command) => {
      if (command === "play") {
        this.resume();
      } else if (command === "pause") {
        this.pause();
      } else if (command === "nextTrack") {
        void this.skip(1);
      } else if (command === "previousTrack") {
        void this.skip(-1);
      }
    };
  }

  bind(bindings: PlayerBindings) {
    this.bindings = bindings;
  }

  setQueue(queue: Track[]) {
    this.queue = [...queue];
  }

  getQueue() {
    return [...this.queue];
  }

  getCurrentTrack() {
    return this.currentIndex >= 0 ? this.queue[this.currentIndex] ?? null : null;
  }

  getCurrentIndex() {
    return this.currentIndex;
  }

  getCurrentTime() {
    return this.player.currentTime ?? 0;
  }

  getDuration() {
    return this.player.duration ?? 0;
  }

  async playIndex(index: number) {
    if (index < 0 || index >= this.queue.length) {
      return;
    }

    const loadToken = ++this.loadToken;
    this.currentIndex = index;
    this.bindings.onCurrentTrackChange?.(this.queue[index], this.currentIndex);
    this.emitState("loading", "正在准备播放");

    await SharedAudioSession.setCategory("playback");
    await SharedAudioSession.setActive(true);

    let track = this.queue[index];
    if (!(track.localFilePath && FileManager.existsSync(track.localFilePath))) {
      track = await resolveTrackStream(track);
      this.queue[index] = track;
      this.bindings.onQueueChange?.([...this.queue]);
    }

    const source =
      track.localFilePath && FileManager.existsSync(track.localFilePath)
        ? track.localFilePath
        : track.streamUrl!;

    this.player.stop();
    const ready = this.player.setSource(source);
    if (!ready) {
      throw new Error("播放器无法装载音频源");
    }

    this.player.onReadyToPlay = () => {
      if (loadToken !== this.loadToken) return;
      this.player.play();
      this.startTicker();
      this.updateNowPlaying();
      this.bindings.onCurrentTrackChange?.(this.queue[this.currentIndex], this.currentIndex);
    };
  }

  pause() {
    this.player.pause();
    this.updateNowPlaying();
  }

  resume() {
    if (!this.getCurrentTrack()) return;
    this.player.play();
    this.startTicker();
    this.updateNowPlaying();
  }

  toggle() {
    if (this.player.timeControlStatus === TimeControlStatus.playing) {
      this.pause();
    } else {
      this.resume();
    }
  }

  async skip(delta: number) {
    const nextIndex = this.currentIndex + delta;
    if (nextIndex < 0 || nextIndex >= this.queue.length) {
      this.pause();
      return;
    }
    await this.playIndex(nextIndex);
  }

  stop() {
    this.player.stop();
    this.stopTicker();
    this.emitState("paused");
    MediaPlayer.nowPlayingInfo = null;
  }

  dispose() {
    this.stopTicker();
    this.player.stop();
    this.player.dispose();
    MediaPlayer.nowPlayingInfo = null;
  }

  private emitState(state: PlaybackUiState, detail?: string) {
    this.bindings.onStateChange?.(state, detail);
  }

  private startTicker() {
    this.stopTicker();
    this.updateTimer = setInterval(() => {
      this.updateNowPlaying();
    }, 1000) as unknown as number;
  }

  private stopTicker() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = undefined;
    }
  }

  private updateNowPlaying() {
    const currentTrack = this.getCurrentTrack();
    if (!currentTrack) return;

    MediaPlayer.nowPlayingInfo = {
      title: currentTrack.title,
      artist: currentTrack.artist,
      albumTitle: currentTrack.sourceTitle,
      elapsedPlaybackTime: this.player.currentTime ?? 0,
      playbackDuration:
        this.player.duration || currentTrack.durationSeconds || 0,
      playbackRate:
        this.player.timeControlStatus === TimeControlStatus.playing ? 1.0 : 0.0,
    };
  }
}

const sharedPlayer = new AzusaScriptingPlayer();

export function getSharedPlayer() {
  return sharedPlayer;
}
