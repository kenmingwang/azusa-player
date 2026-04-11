import React, { useEffect, useState, useCallback, useContext, useRef } from 'react';
import ReactJkMusicPlayer from 'react-jinke-music-player';
import '../css/react-jinke-player.css';
import Box from '@mui/material/Box';
import { FavList } from './FavList';
import { BiliBiliIcon } from './bilibiliIcon';
import { LyricOverlay } from './LyricOverlay';
import StorageManagerCtx from '../popup/App';
import { browserApi } from '../platform/browserApi';

interface SongLike {
  id: string;
  bvid: string;
  name: string;
  singer: string;
  cover: string;
  musicSrc: string | (() => Promise<string>);
}

interface PlayerProps {
  songList: any[];
}

interface CurrentAudioView {
  id: string;
  name: string;
  singer: string;
  cover: string;
}

interface PlayerSettings {
  playMode: string;
  defaultVolume: number;
  darkMode?: boolean;
}

const options = {
  mode: 'full',
  showThemeSwitch: false,
  showLyric: false,
  toggleMode: false,
  locale: 'zh_CN',
  autoPlayInitLoadPlayList: true,
  autoPlay: false,
  defaultPlayIndex: 0,
};

const LYRIC_UI_SYNC_INTERVAL_MS = 180;

const shuffleWithoutImmediateRepeat = (songs: SongLike[] = [], keepSongId?: string) => {
  const list = [...songs];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }

  if (!keepSongId || list.length < 2) return list;
  const keepIndex = list.findIndex((s) => s.id == keepSongId);
  if (keepIndex > 0) {
    const [keepSong] = list.splice(keepIndex, 1);
    list.unshift(keepSong);
  }
  return list;
};

const dedupeSongsById = (songs: SongLike[] = []) => {
  const deduped: SongLike[] = [];
  const seen = new Set<string>();
  for (const song of songs) {
    if (!song?.id || seen.has(song.id)) continue;
    seen.add(song.id);
    deduped.push(song);
  }
  return deduped;
};

const buildQueueForMode = (songs: SongLike[] = [], playMode: string, keepSongId?: string) => {
  if (playMode === 'shufflePlay') {
    return shuffleWithoutImmediateRepeat(songs, keepSongId);
  }
  return [...songs];
};

const reconcileQueueOrder = (queueOrder: SongLike[] = [], visibleQueue: SongLike[] = []) => {
  const visibleIds = new Set(visibleQueue.map((song) => String(song.id)));
  const nextQueueOrder = queueOrder.filter((song) => visibleIds.has(String(song.id)));
  const existingIds = new Set(nextQueueOrder.map((song) => String(song.id)));

  visibleQueue.forEach((song) => {
    const songId = String(song.id);
    if (!existingIds.has(songId)) {
      existingIds.add(songId);
      nextQueueOrder.push(song);
    }
  });

  return dedupeSongsById(nextQueueOrder);
};

export const Player = function ({ songList }: PlayerProps) {
  const [params, setParams] = useState<any>(null);
  const [queueOrder, setQueueOrder] = useState<SongLike[]>([]);
  const [playingList, setPlayingList] = useState<SongLike[]>([]);
  const [currentAudio, setCurrentAudio] = useState<CurrentAudioView | null>(null);
  const [lyricCurrentTime, setLyricCurrentTime] = useState(0);
  const [currentAudioInst, setCurrentAudioInst] = useState<any>(null);
  const [pendingImmediatePlayId, setPendingImmediatePlayId] = useState<string | null>(null);
  const [pendingImmediatePlayTick, setPendingImmediatePlayTick] = useState(0);
  const [showLyric, setShowLyric] = useState(false);
  const [playerSettings, setPlayerSettings] = useState<PlayerSettings | null>(null);
  const lastLyricUiSyncAtRef = useRef(0);
  const currentTrackRef = useRef<CurrentAudioView | null>(null);
  const currentAudioInstRef = useRef<any>(null);
  const playerSettingsRef = useRef<PlayerSettings | null>(null);
  const pendingImmediatePlayAttemptsRef = useRef(0);
  const pendingImmediatePlayTimerRef = useRef<number | null>(null);
  const pendingImmediatePlayIndexRef = useRef(-1);
  const StorageManager = useContext(StorageManagerCtx);

  const buildExternalLink = (audioInfo?: Partial<SongLike> | null) => {
    if (!audioInfo?.bvid) return null;
    const link = `https://www.bilibili.com/video/${audioInfo.bvid}`;
    return (
      <span className='group audio-download' title='Bilibili'>
        <a href={link} target='_blank' rel='noreferrer' style={{ color: 'inherit', textDecoration: 'none' }}>
          <BiliBiliIcon />
        </a>
      </span>
    );
  };

  const syncPlayerQueue = useCallback(
    ({
      nextQueueOrder,
      playMode,
      preferredSongId,
      preserveVisibleOrder = false,
      quietUpdate = true,
      clearPriorAudioLists = false,
      syncTrackIndex = true,
    }: {
      nextQueueOrder: SongLike[];
      playMode: string;
      preferredSongId?: string;
      preserveVisibleOrder?: boolean;
      quietUpdate?: boolean;
      clearPriorAudioLists?: boolean;
      syncTrackIndex?: boolean;
    }) => {
      const anchorSongId = preferredSongId || currentTrackRef.current?.id || currentAudio?.id;
      const nextVisibleQueue = preserveVisibleOrder
        ? dedupeSongsById(playingList)
        : buildQueueForMode(nextQueueOrder, playMode, anchorSongId);
      const nextTrackIndex = anchorSongId
        ? nextVisibleQueue.findIndex((song) => String(song.id) === String(anchorSongId))
        : -1;

      setQueueOrder(nextQueueOrder);
      setPlayingList(nextVisibleQueue);
      setParams((currentParams: any) =>
        currentParams
          ? {
              ...currentParams,
              playMode,
              quietUpdate,
              clearPriorAudioLists,
              audioLists: nextVisibleQueue,
            }
          : currentParams,
      );

      if (syncTrackIndex && nextTrackIndex >= 0 && currentAudioInstRef.current?.updatePlayIndex) {
        window.setTimeout(() => {
          currentAudioInstRef.current?.updatePlayIndex?.(nextTrackIndex);
        }, 0);
      }

      return nextVisibleQueue;
    },
    [currentAudio, playingList],
  );

  const applyAudioListUpdate = useCallback(
    ({
      songs,
      immediatePlay = false,
      replaceList = false,
      preferredSongId,
    }: {
      songs: SongLike[];
      immediatePlay?: boolean;
      replaceList?: boolean;
      preferredSongId?: string;
    }) => {
      if (!params) return;
      const baseList = replaceList ? [] : queueOrder;
      const merged = immediatePlay ? [...songs, ...baseList] : [...baseList, ...songs];

      const deduped = dedupeSongsById(merged);
      const activePlayMode = playerSettings?.playMode || params.playMode || 'order';
      const nextVisibleQueue = syncPlayerQueue({
        nextQueueOrder: deduped,
        playMode: activePlayMode,
        preferredSongId: immediatePlay ? preferredSongId : undefined,
        quietUpdate: !immediatePlay,
        clearPriorAudioLists: immediatePlay || replaceList,
        syncTrackIndex: !immediatePlay,
      });
      if (preferredSongId) {
        pendingImmediatePlayIndexRef.current = nextVisibleQueue.findIndex((song) => String(song.id) === preferredSongId);
        setPendingImmediatePlayId(preferredSongId);
        setPendingImmediatePlayTick(0);
      }
      console.info('[azusa-player][play]', 'applyAudioListUpdate', {
        immediatePlay,
        replaceList,
        incomingSongIds: songs.map((song) => String(song.id)),
        mergedSongIds: nextVisibleQueue.slice(0, 8).map((song) => String(song.id)),
        mergedCount: nextVisibleQueue.length,
        preferredSongId: preferredSongId || null,
        preferredIndex: pendingImmediatePlayIndexRef.current,
      });
    },
    [params, queueOrder, playerSettings, syncPlayerQueue],
  );

  const onPlayOneFromFav = useCallback(
    (songs: any[]) => {
      if (!songs?.length) return;
      console.info('[azusa-player][play]', 'onPlayOneFromFav', {
        requestedSongId: String(songs[0].id),
        currentTrackId: currentTrackRef.current?.id || null,
        playingListCount: playingList.length,
      });
      const existingIndex = playingList.findIndex((s) => s.id == songs[0].id);
      if (existingIndex !== -1 && currentAudioInstRef.current?.playByIndex) {
        setPendingImmediatePlayId(null);
        setPendingImmediatePlayTick(0);
        pendingImmediatePlayIndexRef.current = existingIndex;
        pendingImmediatePlayAttemptsRef.current = 0;
        currentAudioInstRef.current.playByIndex(existingIndex);
        return;
      }
      pendingImmediatePlayAttemptsRef.current = 0;
      applyAudioListUpdate({ songs, immediatePlay: true, preferredSongId: String(songs[0].id) });
    },
    [playingList, applyAudioListUpdate],
  );

  const onAddOneFromFav = useCallback(
    (songs: any[]) => {
      if (!songs?.length) return;
      applyAudioListUpdate({ songs, immediatePlay: false });
    },
    [applyAudioListUpdate],
  );

  const onPlayAllFromFav = useCallback(
    (songs: any[]) => {
      applyAudioListUpdate({ songs, immediatePlay: false, replaceList: true });
    },
    [applyAudioListUpdate],
  );

  const onAddFavToList = useCallback(
    (songs: any[]) => {
      if (!songs?.length) return;
      const newSongs = songs.filter((v) => playingList.find((s) => s.id == v.id) == undefined);
      applyAudioListUpdate({ songs: newSongs, immediatePlay: false, replaceList: false });
    },
    [playingList, applyAudioListUpdate],
  );

  const playByIndex = useCallback(
    (index: number) => {
      currentAudioInstRef.current?.playByIndex?.(index);
    },
    [],
  );

  const onPlayModeChange = (playMode: string) => {
    if (!playerSettings || !params) return;

    const nextSettings = { ...playerSettings, playMode };
    playerSettingsRef.current = nextSettings;
    setPlayerSettings(nextSettings);
    StorageManager.setPlayerSetting(nextSettings);
    syncPlayerQueue({
      nextQueueOrder: queueOrder,
      playMode,
      preserveVisibleOrder: playMode === 'singleLoop',
      quietUpdate: true,
      clearPriorAudioLists: false,
      syncTrackIndex: true,
    });
  };

  const onAudioVolumeChange = (currentVolume: number) => {
    if (!playerSettings) return;
    const nextSettings = { ...playerSettings, defaultVolume: Math.sqrt(currentVolume) };
    playerSettingsRef.current = nextSettings;
    setPlayerSettings(nextSettings);
    StorageManager.setPlayerSetting(nextSettings);
  };

  const syncCurrentTrack = useCallback((audioInfo?: Partial<SongLike> & { id?: string | number; singer?: string }) => {
    if (!audioInfo?.id) return false;
    const nextTrack: CurrentAudioView = {
      id: String(audioInfo.id),
      name: String(audioInfo.name || ''),
      singer: String(audioInfo.singer || ''),
      cover: String(audioInfo.cover || ''),
    };
    const prevTrack = currentTrackRef.current;
    if (
      prevTrack &&
      prevTrack.id === nextTrack.id &&
      prevTrack.name === nextTrack.name &&
      prevTrack.singer === nextTrack.singer &&
      prevTrack.cover === nextTrack.cover
    ) {
      return false;
    }
    currentTrackRef.current = nextTrack;
    setCurrentAudio(nextTrack);
    return true;
  }, []);

  const onAudioPlay = useCallback(
    (audioInfo?: SongLike) => {
      if (!params || !audioInfo?.id) return;
      console.info('[azusa-player][play]', 'onAudioPlay', {
        audioId: String(audioInfo.id),
        audioName: audioInfo.name,
        pendingImmediatePlayId,
      });
      const trackChanged = syncCurrentTrack(audioInfo);
      if (trackChanged) {
        setLyricCurrentTime(0);
      }
      if (pendingImmediatePlayId && String(audioInfo.id) === pendingImmediatePlayId) {
        setPendingImmediatePlayId(null);
        setPendingImmediatePlayTick(0);
        pendingImmediatePlayIndexRef.current = -1;
        pendingImmediatePlayAttemptsRef.current = 0;
        if (pendingImmediatePlayTimerRef.current) {
          window.clearTimeout(pendingImmediatePlayTimerRef.current);
          pendingImmediatePlayTimerRef.current = null;
        }
      }
      lastLyricUiSyncAtRef.current = 0;
      setParams({ ...params, extendsContent: buildExternalLink(audioInfo) });
      browserApi.storage.local.set({
        CurrentPlaying: { cid: String(audioInfo.id), playUrl: audioInfo.musicSrc },
      });
    },
    [params, syncCurrentTrack, pendingImmediatePlayId],
  );

  const onAudioListsChange = useCallback(
    (_currentPlayId: string, audioLists: SongLike[]) => {
      const deduped = dedupeSongsById(audioLists);
      StorageManager.setLastPlayList(deduped as any);
      setParams((currentParams: any) =>
        currentParams
          ? {
              ...currentParams,
              audioLists: deduped,
            }
          : currentParams,
      );
      setPlayingList(deduped);
      setQueueOrder((currentQueueOrder) =>
        playerSettingsRef.current?.playMode === 'shufflePlay' ? reconcileQueueOrder(currentQueueOrder, deduped) : deduped,
      );
    },
    [StorageManager],
  );

  const onAudioProgress = (audioInfo: any) => {
    const now = Date.now();
    const trackChanged = syncCurrentTrack(audioInfo);
    const nextTime = Number(audioInfo?.currentTime || 0);
    if (trackChanged || now - lastLyricUiSyncAtRef.current >= LYRIC_UI_SYNC_INTERVAL_MS) {
      lastLyricUiSyncAtRef.current = now;
      setLyricCurrentTime((prev) => (Math.abs(prev - nextTime) < 0.05 ? prev : nextTime));
    }
  };

  const getAudioInstance = (audio: any) => {
    currentAudioInstRef.current = audio;
    setCurrentAudioInst(audio);
  };

  const customDownloader = (downloadInfo: { src: string }) => {
    fetch(downloadInfo.src)
      .then((res) => res.blob())
      .then((blob) => {
        const href = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = href;
        link.download = `${currentAudioInst?.title || 'music'}.mp3`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(href);
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    const isEditableElement = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditableElement(e.target)) return;
      const audioElem = document.querySelector('audio');
      if (!audioElem) return;

      if (e.code === 'Space') {
        e.preventDefault();
        audioElem.paused ? audioElem.play().catch(() => null) : audioElem.pause();
        return;
      }

      if (e.code === 'ArrowUp') {
        e.preventDefault();
        audioElem.volume = Math.min(1, audioElem.volume + 0.05);
        return;
      }

      if (e.code === 'ArrowDown') {
        e.preventDefault();
        audioElem.volume = Math.max(0, audioElem.volume - 0.05);
        return;
      }

      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (e.ctrlKey && currentAudioInst?.playPrev) {
          currentAudioInst.playPrev();
          return;
        }
        const step = e.shiftKey ? 10 : 5;
        audioElem.currentTime = Math.max(0, audioElem.currentTime - step);
        return;
      }

      if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (e.ctrlKey && currentAudioInst?.playNext) {
          currentAudioInst.playNext();
          return;
        }
        const step = e.shiftKey ? 10 : 5;
        const targetTime = audioElem.currentTime + step;
        audioElem.currentTime = Math.min(audioElem.duration || targetTime, targetTime);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentAudioInst]);

  useEffect(() => {
    if (!songList) return;
    browserApi.storage.local.set({ CurrentPlaying: {} });
    browserApi.storage.local.remove('SongProgressMap');

    async function initPlayer() {
      let setting = (await StorageManager.getPlayerSetting()) as PlayerSettings | undefined;
      if (setting == undefined) {
        setting = { playMode: 'order', defaultVolume: 0.5, darkMode: false };
        StorageManager.setPlayerSetting(setting);
      }

      const lists = dedupeSongsById(songList as SongLike[]);

      const initialParams = {
        ...options,
        ...setting,
        playMode: setting.playMode,
        audioLists: lists,
        extendsContent: buildExternalLink(lists[0]),
      };
      setParams(initialParams);
      setQueueOrder(lists);
      setPlayingList(lists);
      playerSettingsRef.current = setting;
      setPlayerSettings(setting);
    }

    initPlayer();
  }, [songList]);

  useEffect(() => {
    if (!playerSettings) return;
    document.body.dataset.theme = playerSettings.darkMode ? 'dark' : 'light';
  }, [playerSettings]);

  useEffect(() => {
    if (!pendingImmediatePlayId || !currentAudioInst?.playByIndex) return;
    const targetIndex =
      pendingImmediatePlayIndexRef.current >= 0
        ? pendingImmediatePlayIndexRef.current
        : playingList.findIndex((song) => String(song.id) === pendingImmediatePlayId);
    if (targetIndex === -1) return;

    if (pendingImmediatePlayTimerRef.current) {
      window.clearTimeout(pendingImmediatePlayTimerRef.current);
      pendingImmediatePlayTimerRef.current = null;
    }

    pendingImmediatePlayAttemptsRef.current += 1;
    console.info('[azusa-player][play]', 'tryImmediatePlay', {
      targetSongId: pendingImmediatePlayId,
      targetIndex,
      attempt: pendingImmediatePlayAttemptsRef.current,
      currentTrackId: currentTrackRef.current?.id || null,
      playingListHead: playingList.slice(0, 5).map((song) => String(song.id)),
    });
    currentAudioInst.playByIndex(targetIndex);

    pendingImmediatePlayTimerRef.current = window.setTimeout(() => {
      if (currentTrackRef.current?.id === pendingImmediatePlayId) {
        setPendingImmediatePlayId(null);
        pendingImmediatePlayAttemptsRef.current = 0;
        pendingImmediatePlayTimerRef.current = null;
        return;
      }

      if (pendingImmediatePlayAttemptsRef.current >= 8) {
        console.warn('[azusa-player][play]', 'immediate play timed out', {
          targetSongId: pendingImmediatePlayId,
          currentTrackId: currentTrackRef.current?.id || null,
          targetIndex,
        });
        setPendingImmediatePlayId(null);
        setPendingImmediatePlayTick(0);
        pendingImmediatePlayIndexRef.current = -1;
        pendingImmediatePlayAttemptsRef.current = 0;
        pendingImmediatePlayTimerRef.current = null;
        return;
      }

      setPendingImmediatePlayTick((current) => current + 1);
    }, 250);
  }, [pendingImmediatePlayId, pendingImmediatePlayTick, currentAudioInst, playingList]);

  useEffect(() => {
    return () => {
      if (pendingImmediatePlayTimerRef.current) {
        window.clearTimeout(pendingImmediatePlayTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (showLyric && !currentAudio) {
      setShowLyric(false);
    }
  }, [showLyric, currentAudio]);

  const onDarkModeChange = useCallback(
    (darkMode: boolean) => {
      if (!playerSettings) return;
      const nextSettings = { ...playerSettings, darkMode };
      playerSettingsRef.current = nextSettings;
      setPlayerSettings(nextSettings);
      StorageManager.setPlayerSetting(nextSettings);
    },
    [playerSettings, StorageManager],
  );

  const onCoverToggle = useCallback(() => {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
    setShowLyric((v) => !v);
  }, []);

  const playerStateQueue = JSON.stringify((params?.audioLists || []).map((song: SongLike) => String(song.id)));

  return (
    <>
      <div
        data-testid='player-state'
        hidden
        data-play-mode={playerSettings?.playMode || ''}
        data-current-audio-id={currentAudio?.id || ''}
        data-queue={playerStateQueue}
      />
      <div style={{ position: 'fixed', left: '-9999px', top: 0, width: 1, height: 1, overflow: 'hidden' }} aria-hidden='true'>
        <button data-testid='set-play-mode-order' onClick={() => onPlayModeChange('order')}>
          order
        </button>
        <button data-testid='set-play-mode-order-loop' onClick={() => onPlayModeChange('orderLoop')}>
          orderLoop
        </button>
        <button data-testid='set-play-mode-single-loop' onClick={() => onPlayModeChange('singleLoop')}>
          singleLoop
        </button>
        <button data-testid='set-play-mode-shuffle' onClick={() => onPlayModeChange('shufflePlay')}>
          shufflePlay
        </button>
      </div>

      {params ? (
        <FavList
          currentAudioList={params.audioLists}
          currentAudioId={currentAudio?.id}
          darkMode={!!playerSettings?.darkMode}
          onDarkModeChange={onDarkModeChange}
          onPlayOneFromFav={onPlayOneFromFav}
          onPlayAllFromFav={onPlayAllFromFav}
          onAddFavToList={onAddFavToList}
          onAddOneFromFav={onAddOneFromFav}
        />
      ) : null}

      {currentAudio ? (
        <LyricOverlay
          showLyric={showLyric}
          onRequestClose={() => setShowLyric(false)}
          currentTime={lyricCurrentTime}
          audioName={currentAudio.name}
          audioId={currentAudio.id}
          artist={currentAudio.singer}
          audioCover={currentAudio.cover}
        />
      ) : null}

      {params ? (
        <Box display='flex' flex='1' justifyContent='space-around' sx={{ gridArea: 'footer', height: '84px', width: '100%' }}>
          <ReactJkMusicPlayer
            {...params}
            showMediaSession
            onAudioVolumeChange={onAudioVolumeChange}
            onPlayModeChange={onPlayModeChange}
            onAudioError={(...args: any[]) => console.error('audio error', ...args)}
            customDownloader={customDownloader}
            onAudioProgress={onAudioProgress}
            getAudioInstance={getAudioInstance}
            onAudioPlay={onAudioPlay}
            onCoverClick={onCoverToggle}
            onAudioListsChange={onAudioListsChange}
          />
        </Box>
      ) : null}
    </>
  );
};

