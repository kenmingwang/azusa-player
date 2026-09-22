import React, { useState, useEffect, useContext, useRef } from 'react';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import { searchLyric } from '../utils/Data';
import { fetchLyricText, pickBestLyricCandidate, searchLyricCandidates, type LyricCandidate } from '../utils/lyricApi';
import StorageManagerCtx from '../popup/App';

const NO_LYRIC_FOUND = '[00:00.000] 无法找到歌词, 请手动搜索';

const buildLegacyCandidate = (option: any): LyricCandidate => ({
  key: option?.key || `${option?.source}:${option?.id}`,
  source: option?.source,
  id: String(option?.id),
  name: option?.name || '',
  artist: option?.artist || '',
  label: option?.label || option?.name || '',
});

interface LyricSearchBarProps {
  SearchKey: string;
  SongId: string;
  setLyric: (lrc: string) => void;
  localOption?: any;
  /** Notified whenever a version is picked (auto-pick included), so hosts can show its source. */
  onCandidateChange?: (candidate: LyricCandidate) => void;
}

/** Song name -> candidate list (QQ 音乐 + 网易云), auto-picking the version that matches the song name best. */
export const LyricSearchBar = function ({ SearchKey, SongId, setLyric, localOption, onCandidateChange }: LyricSearchBarProps) {
  const [options, setOptions] = useState<LyricCandidate[]>([]);
  const [value, setValue] = useState<LyricCandidate | undefined>(undefined);
  const StorageManager = useContext(StorageManagerCtx);
  const requestIdRef = useRef(0);
  const localSongMid = localOption?.songMid || localOption?.lrc?.songMid || (typeof localOption?.lrc === 'string' ? localOption.lrc : '');

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    setOptions([]);
    setValue(undefined);

    searchLyricCandidates(SearchKey)
      .then((nextOptions) => {
        if (requestIdRef.current !== requestId) return;
        setOptions(nextOptions);
      })
      .catch(() => {
        if (requestIdRef.current !== requestId) return;
        setOptions([]);
      });
  }, [SearchKey, SongId]);

  const applyCandidate = (candidate: LyricCandidate) => {
    setValue(candidate);
    onCandidateChange?.(candidate);
    StorageManager.setLyricDetail(SongId.toString(), {
      key: candidate.key,
      source: candidate.source,
      songMid: candidate.source === 'qq' ? candidate.id : '',
      id: candidate.id,
      name: candidate.name,
      artist: candidate.artist,
      label: candidate.label,
    });

    fetchLyricText(candidate)
      .then((lrc) => setLyric(lrc || NO_LYRIC_FOUND))
      .catch(() => setLyric(NO_LYRIC_FOUND));
  };

  useEffect(() => {
    // A stored pick for this song wins; legacy records only kept a QQ songmid.
    if (localOption?.source && localOption?.id) {
      applyCandidate(buildLegacyCandidate(localOption));
      return;
    }

    if (localSongMid) {
      setValue(undefined);
      searchLyric(localSongMid, setLyric);
      return;
    }

    if (options.length > 0) {
      const best = pickBestLyricCandidate(options, { name: SearchKey });
      if (best) applyCandidate(best);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, localOption]);

  const onOptionSet = (_e: unknown, newValue: LyricCandidate | null | undefined) => {
    if (!newValue) return;
    applyCandidate(newValue);
  };

  return (
    <Autocomplete
      disableClearable
      onChange={onOptionSet}
      value={value}
      id='LyricSearchBar'
      options={options}
      sx={{ width: '100%' }}
      size='small'
      renderInput={(params) => <TextField {...params} label={'歌词候选'} />}
      isOptionEqualToValue={(option, selected) => option.key === selected.key}
    />
  );
};
