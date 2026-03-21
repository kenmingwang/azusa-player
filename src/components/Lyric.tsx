import React, { useEffect, useState, useCallback, useContext } from 'react';
import { Lrc } from 'react-lrc';
const LrcAny: any = Lrc;
import { ScrollBar } from '../styles/styles';
import TextField from '@mui/material/TextField';
import { withStyles } from '@mui/styles';
import Grid from '@mui/material/Grid';
import { reExtractSongName as extractSongName } from '../utils/re';
import { LyricSearchBar } from './LyricSearchBar';
import StorageManagerCtx from '../popup/App';

const INTERVAL_OF_RECOVERING_AUTO_SCROLL_AFTER_USER_SCROLL = 5000;

const styles = () => ({
  inputOffset: {
    height: 40,
    width: 140,
  },
  inputLrc: {
    height: 40,
    width: 375,
  },
});

interface LyricProps {
  classes: any;
  currentTime: number;
  audioName: string;
  audioId: string;
  audioCover: string;
  artist: string;
}

export const Lyric = withStyles(styles)((props: LyricProps) => {
  const [lyricOffset, setLyricOffset] = useState(0);
  const [lyric, setLyric] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [localOption, setLocalOption] = useState<any>(null);

  const { classes, currentTime, audioName, audioId, audioCover, artist } = props;
  const StorageManager = useContext(StorageManagerCtx);

  useEffect(() => {
    async function initLyric() {
      const detail = await StorageManager.getLyricDetail(audioId.toString());
      if (detail != undefined) {
        setLyricOffset(detail.lrcOffset || 0);
        setLocalOption(detail);
      }
      setSongTitle(extractSongName(audioName, artist));
    }
    initLyric();
  }, [audioName, audioId, artist]);

  const onSongTitleChange = useCallback((lrc: string) => {
    setLyric(lrc);
  }, []);

  const onLrcOffsetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const offset = Number(e.target.value);
    setLyricOffset(offset);
    StorageManager.setLyricOffset(audioId, offset);
  };

  const className = ScrollBar().root;

  return (
    <>
      <Grid container spacing={1} sx={{ maxHeight: '100vh', minHeight: '100vh', overflow: 'hidden' }}>
        <Grid sx={{ alignItems: 'center', pb: 10, overflow: 'hidden', minHeight: 'calc(100% - 100px)' }} item xs={6}>
          <Grid container spacing={0} sx={{ maxHeight: '100vh', overflow: 'hidden', mt: '50px' }}>
            <Grid sx={{ pt: '8px', pl: '2px', overflow: 'hidden' }} item xs={12}>
              <img id='LrcImg' src={audioCover} style={{ maxWidth: '500px' }} alt='cover' />
            </Grid>
            <Grid sx={{ pt: '8px', pl: '2px', overflow: 'hidden' }} item xs={12}>
              <Grid container spacing={0} sx={{ maxHeight: '100vh', overflow: 'hidden', width: '500px' }}>
                <Grid sx={{ pt: '8px', pr: '2px', overflow: 'hidden' }} item xs={3}>
                  <TextField
                    type='number'
                    variant='outlined'
                    label='歌词偏移(ms)'
                    InputProps={{
                      className: classes.inputOffset,
                      inputProps: { min: -9999, max: 9999 },
                    }}
                    value={lyricOffset}
                    onChange={onLrcOffsetChange}
                  />
                </Grid>
                <Grid sx={{ pt: '8px', overflow: 'hidden' }} style={{ maxWidth: 'fit-content' }} item xs={9}>
                  <TextField
                    variant='outlined'
                    label='歌词搜索'
                    InputProps={{ className: classes.inputLrc }}
                    InputLabelProps={{ shrink: true }}
                    placeholder={songTitle}
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === 'Enter') setSongTitle((e.target as HTMLInputElement).value);
                    }}
                  />
                </Grid>
              </Grid>
            </Grid>

            <Grid sx={{ pt: '8px', pl: '2px', overflow: 'hidden' }} item xs={12}>
              <LyricSearchBar SearchKey={songTitle} SongId={audioId} setLyric={onSongTitleChange} localOption={localOption} />
            </Grid>
          </Grid>
        </Grid>

        <Grid style={{ paddingBottom: 10, overflow: 'auto', maxHeight: 'calc(100% - 130px)' }} item xs={6}>
          <LrcAny
            className={className}
            style={{ maxHeight: '100%', paddingRight: '80px' }}
            lrc={lyric}
            autoScroll
            lineRenderer={({ line: { content }, active }: any) => (
              <div
                style={{
                  textAlign: 'center',
                  color: active ? '#c660e7' : '#4d388f',
                  padding: '6px 12px',
                  fontSize: active ? '18px' : '15px',
                  fontFamily: "Georgia,'Microsoft YaHei',simsun,serif",
                }}
              >
                {content}
              </div>
            )}
            currentMillisecond={+currentTime * 1000 + +lyricOffset}
            intervalOfRecoveringAutoScrollAfterUserScroll={INTERVAL_OF_RECOVERING_AUTO_SCROLL_AFTER_USER_SCROLL}
          />
        </Grid>
      </Grid>
    </>
  );
});

