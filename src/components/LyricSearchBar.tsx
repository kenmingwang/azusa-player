import React, { useState, useEffect, useContext, useRef } from 'react';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import { searchLyricOptions, searchLyric } from '../utils/Data';
import StorageManagerCtx from '../popup/App';

interface LyricOption {
  key: string;
  songMid: string;
  label: string;
}

interface LyricSearchBarProps {
  SearchKey: string;
  SongId: string;
  setLyric: (lrc: string) => void;
  localOption?: any;
}

export const LyricSearchBar = function ({ SearchKey, SongId, setLyric, localOption }: LyricSearchBarProps) {
  const [options, setOptions] = useState<LyricOption[]>([]);
  const [value, setValue] = useState<LyricOption | undefined>(undefined);
  const StorageManager = useContext(StorageManagerCtx);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    setOptions([]);
    setValue(undefined);
    searchLyricOptions(SearchKey, (nextOptions: LyricOption[]) => {
      if (requestIdRef.current !== requestId) return;
      setOptions(nextOptions);
    });
  }, [SearchKey, SongId]);

  useEffect(() => {
    const songMidFromLocal = localOption?.songMid || localOption?.lrc?.songMid || localOption?.lrc;
    if (songMidFromLocal) {
      setValue(undefined);
      searchLyric(songMidFromLocal, setLyric);
      return;
    }

    if (options.length > 0) {
      onOptionSet(null, options[0]);
    }
  }, [options, localOption]);

  const onOptionSet = (_e: unknown, newValue: LyricOption | null | undefined) => {
    if (!newValue) return;
    setValue(newValue);
    searchLyric(newValue.songMid, setLyric);
    StorageManager.setLyricDetail(SongId.toString(), newValue);
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
      renderInput={(params) => <TextField {...params} label={'\u6b4c\u8bcd\u5019\u9009'} />}
      isOptionEqualToValue={(option, selected) => option.songMid === selected.songMid}
    />
  );
};
