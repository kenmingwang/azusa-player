import React, { useEffect, useState, useCallback, useContext } from 'react';
import { Lrc } from 'react-lrc';
const LrcAny: any = Lrc;
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import { reExtractSongName as extractSongName } from '../utils/re';
import { LyricSearchBar } from './LyricSearchBar';
import { LyricLine } from './LyricLine';
import StorageManagerCtx from '../popup/App';

/** Scroll back to the line being sung this long after the user stops scrolling the lyrics. */
const RECOVER_AUTO_SCROLL_INTERVAL_MS = 3000;

interface LyricPalette {
  active: string;
  inactive: string;
  fieldText: string;
  fieldTextFill: string;
  fieldBg: string;
  fieldBorder: string;
  fieldBorderHover: string;
  fieldBorderFocus: string;
  fieldLabel: string;
  fieldPlaceholder: string;
  fieldCaret: string;
}

const LIGHT_MODE_PALETTE: LyricPalette = {
  active: '#4c2c88',
  inactive: 'rgba(76, 44, 136, 0.92)',
  fieldText: '#2d1f54',
  fieldTextFill: '#2d1f54',
  fieldBg: 'rgba(255, 255, 255, 0.78)',
  fieldBorder: 'rgba(108, 80, 168, 0.28)',
  fieldBorderHover: 'rgba(108, 80, 168, 0.44)',
  fieldBorderFocus: '#8f63d7',
  fieldLabel: 'rgba(73, 49, 126, 0.88)',
  fieldPlaceholder: 'rgba(81, 57, 136, 0.68)',
  fieldCaret: '#6b46be',
};

const DARK_MODE_PALETTE: LyricPalette = {
  active: '#ead9ff',
  inactive: 'rgba(224, 205, 255, 0.92)',
  fieldText: '#f2e8ff',
  fieldTextFill: '#f2e8ff',
  fieldBg: 'rgba(33, 24, 53, 0.78)',
  fieldBorder: 'rgba(181, 146, 240, 0.3)',
  fieldBorderHover: 'rgba(204, 170, 255, 0.5)',
  fieldBorderFocus: '#d7b6ff',
  fieldLabel: 'rgba(227, 209, 255, 0.9)',
  fieldPlaceholder: 'rgba(215, 195, 247, 0.72)',
  fieldCaret: '#d4b0ff',
};

interface LyricProps {
  currentTime: number;
  audioName: string;
  audioId?: string | number;
  audioCover: string;
  artist: string;
  /** Jump the audio to a lyric line (seconds, already offset-corrected). */
  onSeek?: (seconds: number) => void;
}

export const Lyric = function ({ currentTime, audioName, audioId, audioCover, artist, onSeek }: LyricProps) {
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

  const clearNumericBounds = useCallback((node: HTMLInputElement | null) => {
    if (!node) return;
    node.removeAttribute('max');
    node.removeAttribute('min');
  }, []);

  const lyricFieldSx = {
    '& .MuiOutlinedInput-root': {
      color: lyricPalette.fieldText,
      backgroundColor: lyricPalette.fieldBg,
      borderRadius: 1.5,
      '& fieldset': {
        borderColor: lyricPalette.fieldBorder,
      },
      '&:hover fieldset': {
        borderColor: lyricPalette.fieldBorderHover,
      },
      '&.Mui-focused fieldset': {
        borderColor: lyricPalette.fieldBorderFocus,
      },
    },
    '& .MuiInputBase-input': {
      color: lyricPalette.fieldText,
      WebkitTextFillColor: lyricPalette.fieldTextFill,
      caretColor: lyricPalette.fieldCaret,
    },
    '& .MuiInputLabel-root': {
      color: lyricPalette.fieldLabel,
    },
    '& .MuiInputLabel-root.Mui-focused': {
      color: lyricPalette.fieldLabel,
    },
    '& .MuiInputBase-input::placeholder': {
      color: lyricPalette.fieldPlaceholder,
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
                inputProps={{ step: 50 }}
                inputRef={clearNumericBounds}
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
            // react-lrc centres the active line using `line.offsetTop - clientHeight / 2`; offsetTop
            // is relative to the nearest positioned ancestor, so without `relative` on the scroller
            // the measured offset is taken from higher up the page and the scroll misses the centre.
            position: 'relative',
            // Symmetric padding so react-lrc can centre the sung line (it measures against clientHeight).
            padding: '24px 12px',
            boxSizing: 'border-box',
            background: 'transparent',
            // Smooth behaviour makes the post-scroll snap back to the sung line an animated jump.
            scrollBehavior: 'smooth',
          }}
          lrc={lyric}
          autoScroll
          verticalSpace
          recoverAutoScrollInterval={RECOVER_AUTO_SCROLL_INTERVAL_MS}
          lineRenderer={({ line, active }: any) => (
            <LyricLine
              content={line?.content || ''}
              active={!!active}
              startMillisecond={Number(line?.startMillisecond) || 0}
              offset={lyricOffset}
              fontSize={lyricFontSize}
              activeColor={lyricPalette.active}
              inactiveColor={lyricPalette.inactive}
              onSeek={onSeek}
            />
          )}
          currentMillisecond={+currentTime * 1000 + +lyricOffset}
        />
      </Box>
    </Box>
  );
};
