import React, { useEffect, useState, useCallback, useContext } from 'react';
import { Lrc } from 'react-lrc';
const LrcAny: any = Lrc;
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import { reExtractSongName as extractSongName } from '../utils/re';
import { LyricSearchBar } from './LyricSearchBar';
import StorageManagerCtx from '../popup/App';

const INTERVAL_OF_RECOVERING_AUTO_SCROLL_AFTER_USER_SCROLL = 3000;

interface LyricPalette {
  active: string;
  inactive: string;
}

const LIGHT_MODE_PALETTE: LyricPalette = {
  active: '#4c2c88',
  inactive: 'rgba(76, 44, 136, 0.92)',
};

const DARK_MODE_PALETTE: LyricPalette = {
  active: '#4c2c88',
  inactive: 'rgba(76, 44, 136, 0.9)',
};

interface LyricProps {
  currentTime: number;
  audioName: string;
  audioId?: string | number;
  audioCover: string;
  artist: string;
}

export const Lyric = function ({ currentTime, audioName, audioId, audioCover, artist }: LyricProps) {
  const [lyricOffset, setLyricOffset] = useState(0);
  const [lyric, setLyric] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [songTitleInput, setSongTitleInput] = useState('');
  const [localOption, setLocalOption] = useState<any>(null);
  const [lyricFontSize, setLyricFontSize] = useState(16);

  const StorageManager = useContext(StorageManagerCtx);
  const resolvedAudioId = audioId == null ? '' : String(audioId);
  const isDarkMode = typeof document !== 'undefined' && document.body?.dataset?.theme === 'dark';
  const lyricPalette = isDarkMode ? DARK_MODE_PALETTE : LIGHT_MODE_PALETTE;

  useEffect(() => {
    let disposed = false;

    async function initLyric() {
      const extractedSongTitle = extractSongName(audioName, artist);
      setLyric('');
      setLyricOffset(0);
      setLocalOption(null);
      setSongTitle(extractedSongTitle);
      setSongTitleInput(extractedSongTitle);
      const playerSettings = await StorageManager.getPlayerSetting();
      if (disposed) return;
      if (playerSettings?.lyricFontSize) {
        setLyricFontSize(Number(playerSettings.lyricFontSize));
      }
      if (!resolvedAudioId) return;
      const detail = await StorageManager.getLyricDetail(resolvedAudioId);
      if (disposed) return;
      setLyricOffset(detail?.lrcOffset || 0);
      setLocalOption(detail || null);
    }

    initLyric();

    return () => {
      disposed = true;
    };
  }, [audioName, artist, resolvedAudioId, StorageManager]);

  const onSongTitleChange = useCallback((lrc: string) => {
    setLyric(lrc);
  }, []);

  const onLrcOffsetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const offset = Number(e.target.value);
    setLyricOffset(offset);
    if (!resolvedAudioId) return;
    StorageManager.setLyricOffset(resolvedAudioId, offset);
  };

  const onFontSizeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = Number(e.target.value);
    if (Number.isNaN(nextValue)) return;
    setLyricFontSize(nextValue);
    const currentSettings = (await StorageManager.getPlayerSetting()) || {};
    StorageManager.setPlayerSetting({ ...currentSettings, lyricFontSize: nextValue });
  };

  const lyricFieldSx = {
    '& .MuiOutlinedInput-root': {
      color: '#2d1f54',
      backgroundColor: 'rgba(255, 255, 255, 0.78)',
      borderRadius: 1.5,
      '& fieldset': {
        borderColor: 'rgba(108, 80, 168, 0.28)',
      },
      '&:hover fieldset': {
        borderColor: 'rgba(108, 80, 168, 0.44)',
      },
      '&.Mui-focused fieldset': {
        borderColor: '#8f63d7',
      },
    },
    '& .MuiInputBase-input': {
      color: '#2d1f54',
      WebkitTextFillColor: '#2d1f54',
    },
    '& .MuiInputLabel-root': {
      color: 'rgba(73, 49, 126, 0.88)',
    },
    '& .MuiInputLabel-root.Mui-focused': {
      color: '#6b46be',
    },
    '& .MuiInputBase-input::placeholder': {
      color: 'rgba(81, 57, 136, 0.68)',
      opacity: 1,
    },
  } as const;

  return (
    <Box
      sx={{
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        px: { xs: 1.5, md: 2.5 },
        pb: { xs: 1.5, md: 2.5 },
        pt: { xs: 0.5, md: 0.75 },
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) minmax(0, 1fr)' },
        gap: { xs: 1.25, md: 1.5 },
        alignItems: 'stretch',
      }}
    >
      <Box
        sx={{
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          pr: { xs: 0, md: 1.5 },
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 620,
            mx: { xs: 'auto', md: 0 },
            p: { xs: 0.75, md: 1 },
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'center', pb: { xs: 2, md: 2.5 } }}>
            <img
              id='LrcImg'
              src={audioCover}
              alt='cover'
              style={{ width: '100%', maxWidth: '580px', borderRadius: '12px', objectFit: 'cover' }}
            />
          </Box>

          <Grid
            container
            spacing={1.25}
            sx={{
              width: '100%',
              maxWidth: 580,
              mx: 'auto',
              px: { xs: 0.25, sm: 0.5 },
              py: 1,
            }}
            className='lyric-controls'
          >
            <Grid item xs={4} sm={3}>
              <TextField
                fullWidth
                type='number'
                size='small'
                variant='outlined'
                label={'\u6b4c\u8bcd\u504f\u79fb(ms)'}
                inputProps={{ min: -9999, max: 9999 }}
                value={lyricOffset}
                onChange={onLrcOffsetChange}
                sx={lyricFieldSx}
              />
            </Grid>
            <Grid item xs={4} sm={3}>
              <TextField
                fullWidth
                type='number'
                size='small'
                variant='outlined'
                label={'\u5b57\u4f53(px)'}
                inputProps={{ min: 12, max: 32 }}
                value={lyricFontSize}
                onChange={onFontSizeChange}
                sx={lyricFieldSx}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size='small'
                variant='outlined'
                label={'\u6b4c\u8bcd\u641c\u7d22'}
                InputLabelProps={{ shrink: true }}
                value={songTitleInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSongTitleInput(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') {
                    setSongTitle(songTitleInput.trim() || extractSongName(audioName, artist));
                  }
                }}
                sx={lyricFieldSx}
              />
            </Grid>
            <Grid item xs={12}>
              <LyricSearchBar
                key={resolvedAudioId || songTitle}
                SearchKey={songTitle}
                SongId={resolvedAudioId}
                setLyric={onSongTitleChange}
                localOption={localOption}
              />
            </Grid>
          </Grid>
        </Box>
      </Box>

      <Box
        sx={{
          minHeight: 0,
          overflow: 'hidden',
          maxWidth: 760,
          width: '100%',
          mx: { xs: 'auto', md: 0 },
          pl: { xs: 0, md: 1.5 },
        }}
      >
        <LrcAny
          style={{
            height: '100%',
            minHeight: '100%',
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '28px 12px 120px',
            boxSizing: 'border-box',
            background: 'transparent',
          }}
          lrc={lyric}
          autoScroll
          lineRenderer={({ line: { content }, active }: any) => (
            <div
              style={{
                textAlign: 'center',
                color: active ? lyricPalette.active : lyricPalette.inactive,
                padding: active ? '10px 16px' : '8px 16px',
                fontSize: `${active ? lyricFontSize + 3 : lyricFontSize}px`,
                fontFamily: "'Microsoft YaHei', 'PingFang SC', 'Noto Serif SC', Georgia, serif",
                lineHeight: 1.82,
                letterSpacing: active ? '0.02em' : '0.01em',
                textShadow: 'none',
                WebkitTextStroke: '0px transparent',
                fontWeight: active ? 700 : 500,
                maxWidth: '680px',
                margin: '0 auto',
              }}
            >
              {content}
            </div>
          )}
          currentMillisecond={+currentTime * 1000 + +lyricOffset}
          intervalOfRecoveringAutoScrollAfterUserScroll={INTERVAL_OF_RECOVERING_AUTO_SCROLL_AFTER_USER_SCROLL}
        />
      </Box>
    </Box>
  );
};
