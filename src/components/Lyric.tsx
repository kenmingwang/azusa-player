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
  const [localOption, setLocalOption] = useState<any>(null);

  const StorageManager = useContext(StorageManagerCtx);
  const resolvedAudioId = audioId == null ? '' : String(audioId);

  useEffect(() => {
    async function initLyric() {
      setSongTitle(extractSongName(audioName, artist));
      if (!resolvedAudioId) return;
      const detail = await StorageManager.getLyricDetail(resolvedAudioId);
      setLyricOffset(detail?.lrcOffset || 0);
      setLocalOption(detail || null);
    }
    initLyric();
  }, [audioName, artist, resolvedAudioId]);

  const onSongTitleChange = useCallback((lrc: string) => {
    setLyric(lrc);
  }, []);

  const onLrcOffsetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const offset = Number(e.target.value);
    setLyricOffset(offset);
    if (!resolvedAudioId) return;
    StorageManager.setLyricOffset(resolvedAudioId, offset);
  };

  return (
    <Box
      sx={{
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        px: { xs: 1.5, md: 2.5 },
        pb: { xs: 1.25, md: 2 },
        pt: 0.75,
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'minmax(280px, 42%) minmax(0, 1fr)' },
        gap: { xs: 1, md: 2 },
      }}
    >
      <Box sx={{ minHeight: 0, overflowY: 'auto', overflowX: 'hidden', pr: { xs: 0, sm: 0.75 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', pb: { xs: 2.75, md: 3.25 } }}>
          <img
            id='LrcImg'
            src={audioCover}
            alt='cover'
            style={{ width: '100%', maxWidth: '560px', borderRadius: '6px', objectFit: 'cover' }}
          />
        </Box>

        <Grid
          container
          spacing={1.25}
          sx={{ width: '100%', maxWidth: 560, mx: 'auto', px: { xs: 0.25, sm: 0.5 }, pb: 0.5, mt: { xs: 0.5, md: 0.75 } }}
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
            />
          </Grid>
          <Grid item xs={8} sm={9}>
            <TextField
              fullWidth
              size='small'
              variant='outlined'
              label={'\u6b4c\u8bcd\u641c\u7d22'}
              InputLabelProps={{ shrink: true }}
              placeholder={songTitle}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter') {
                  setSongTitle((e.target as HTMLInputElement).value);
                }
              }}
            />
          </Grid>
          <Grid item xs={12}>
            <LyricSearchBar SearchKey={songTitle} SongId={resolvedAudioId} setLyric={onSongTitleChange} localOption={localOption} />
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ minHeight: 0, overflow: 'hidden' }}>
        <LrcAny
          style={{
            height: '100%',
            minHeight: '100%',
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '6px 12px 20px',
            boxSizing: 'border-box',
          }}
          lrc={lyric}
          autoScroll
          lineRenderer={({ line: { content }, active }: any) => (
            <div
              style={{
                textAlign: 'center',
                color: active ? '#c660e7' : '#4d388f',
                padding: '6px 10px',
                fontSize: active ? '19px' : '15px',
                fontFamily: "Georgia,'Microsoft YaHei',simsun,serif",
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
