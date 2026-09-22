import React, { useCallback, useEffect, useMemo, useState, useContext } from 'react';
import { Lrc } from 'react-lrc';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import SearchIcon from '@mui/icons-material/Search';
import StorageManagerCtx from '../popup/App';
import { reExtractSongName } from '../utils/re';
import { describeLyricCandidate, type LyricCandidate } from '../utils/lyricApi';
import { LyricSearchBar } from './LyricSearchBar';
import { LyricLine } from './LyricLine';

const LrcAny: any = Lrc;

const OFFSET_STEP_MS = 500;
const OFFSET_LIMIT_MS = 30000;
/** Scroll back to the line being sung this long after the user stops scrolling the lyrics. */
const RECOVER_AUTO_SCROLL_INTERVAL_MS = 3000;

export interface LyricPanelProps {
  currentTime: number;
  audioName?: string;
  audioId?: string | number;
  artist?: string;
  /** Collapse the panel down to its title bar. */
  defaultCollapsed?: boolean;
  /** Jump the audio to a lyric line (seconds, already offset-corrected). */
  onSeek?: (seconds: number) => void;
}

const formatOffset = (offsetMs: number) => {
  const seconds = offsetMs / 1000;
  const sign = seconds > 0 ? '+' : seconds < 0 ? '-' : '±';
  return `${sign}${Math.abs(seconds).toFixed(1)}s`;
};

const clampOffset = (value: number) => Math.max(-OFFSET_LIMIT_MS, Math.min(OFFSET_LIMIT_MS, value));

/** Compact, always-visible lyric panel with time-synced highlighting and ±0.5s offset controls. */
const LyricPanel = ({
  currentTime,
  audioName = '',
  audioId,
  artist = '',
  defaultCollapsed = false,
  onSeek,
}: LyricPanelProps) => {
  const [lyric, setLyric] = useState('');
  const [lyricOffset, setLyricOffset] = useState(0);
  const [localOption, setLocalOption] = useState<any>(null);
  const [pickedLabel, setPickedLabel] = useState('');
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [showPicker, setShowPicker] = useState(false);

  const StorageManager = useContext(StorageManagerCtx);
  const resolvedAudioId = audioId == null ? '' : String(audioId);
  const songTitle = useMemo(() => reExtractSongName(audioName, artist), [audioName, artist]);

  useEffect(() => {
    let disposed = false;
    setLyric('');
    setLyricOffset(0);
    setLocalOption(null);
    setPickedLabel('');
    setShowPicker(false);

    if (!resolvedAudioId) return undefined;

    // Storage is optional here: a missing/incomplete storage manager must never break the player.
    const readDetail = (StorageManager as any)?.getLyricDetail;
    if (typeof readDetail !== 'function') return undefined;

    Promise.resolve(readDetail.call(StorageManager, resolvedAudioId))
      .then((detail: any) => {
        if (disposed) return;
        setLyricOffset(Number(detail?.lrcOffset) || 0);
        setLocalOption(detail || null);
        if (detail?.source && detail?.name) {
          setPickedLabel(describeLyricCandidate(detail));
        }
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
    };
  }, [resolvedAudioId, StorageManager]);

  const applyOffset = useCallback(
    (nextOffset: number) => {
      const clamped = clampOffset(nextOffset);
      setLyricOffset(clamped);
      const writeOffset = (StorageManager as any)?.setLyricOffset;
      if (resolvedAudioId && typeof writeOffset === 'function') {
        writeOffset.call(StorageManager, resolvedAudioId, clamped);
      }
    },
    [StorageManager, resolvedAudioId],
  );

  const onCandidateChange = useCallback((candidate: LyricCandidate) => {
    setPickedLabel(describeLyricCandidate(candidate));
  }, []);

  const headerTitle = songTitle || audioName || '未在播放';

  return (
    <Box
      data-testid='lyric-panel'
      sx={{
        gridArea: 'lyricPanel',
        minHeight: 0,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        borderTop: '1px solid rgba(171, 95, 255, 0.22)',
        px: { xs: 0.5, md: 0.75 },
        pt: 0.5,
        pb: 0.5,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
        <Typography
          variant='subtitle2'
          noWrap
          data-testid='lyric-panel-title'
          sx={{ color: 'var(--azusa-accent, #ab5fff)', flexGrow: 1, minWidth: 0 }}
        >
          {headerTitle}
        </Typography>
        {pickedLabel ? (
          <Tooltip title={`当前歌词版本：${pickedLabel}`}>
            <Chip
              size='small'
              variant='outlined'
              clickable
              onClick={() => setShowPicker((v) => !v)}
              label={pickedLabel}
              data-testid='lyric-panel-source'
              sx={{ maxWidth: 190, fontSize: '0.68rem' }}
            />
          </Tooltip>
        ) : null}
        <Tooltip title='换一个歌词版本'>
          <IconButton size='small' onClick={() => setShowPicker((v) => !v)} data-testid='lyric-panel-toggle-picker'>
            <SearchIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title={collapsed ? '展开歌词' : '收起歌词'}>
          <IconButton size='small' onClick={() => setCollapsed((v) => !v)} data-testid='lyric-panel-toggle-collapse'>
            {collapsed ? <KeyboardArrowUpIcon sx={{ fontSize: 18 }} /> : <KeyboardArrowDownIcon fontSize='small' />}
          </IconButton>
        </Tooltip>
      </Box>

      {collapsed ? null : (
        <>
          {/* Kept mounted (it is what loads the lyric), only visually swapped with the candidate list. */}
          <Box sx={{ display: showPicker ? 'block' : 'none' }}>
            {resolvedAudioId ? (
              <LyricSearchBar
                key={resolvedAudioId}
                SearchKey={songTitle}
                SongId={resolvedAudioId}
                setLyric={setLyric}
                localOption={localOption}
                onCandidateChange={onCandidateChange}
              />
            ) : null}
          </Box>

          <Box
            sx={{
              height: 200,
              minHeight: 0,
              overflow: 'hidden',
              display: showPicker ? 'none' : 'block',
            }}
          >
            <LrcAny
              data-testid='lyric-panel-lrc'
              style={{
                height: '100%',
                overflowY: 'auto',
                overflowX: 'hidden',
                // react-lrc centres the active line with `line.offsetTop - clientHeight / 2`, and
                // offsetTop is measured against the nearest positioned ancestor: without `relative`
                // here every line measures from further up the page and the scroll lands ~330px off.
                position: 'relative',
                // Symmetric padding: any top/bottom asymmetry would also push the sung line off-centre.
                padding: '0 4px',
                boxSizing: 'border-box',
                background: 'transparent',
                // react-lrc assigns scrollTop directly; smooth behaviour turns the "snap back to the
                // sung line" after a manual scroll into a quick animated scroll.
                scrollBehavior: 'smooth',
              }}
              lrc={lyric}
              autoScroll
              // react-lrc needs verticalSpace to have headroom above the first line: without it the
              // active line can never reach the middle of the box.
              verticalSpace
              recoverAutoScrollInterval={RECOVER_AUTO_SCROLL_INTERVAL_MS}
              lineRenderer={({ line, active }: any) => (
                <LyricLine
                  content={line?.content || ''}
                  active={!!active}
                  startMillisecond={Number(line?.startMillisecond) || 0}
                  offset={lyricOffset}
                  fontSize={13}
                  activeColor='#c9a5ff'
                  inactiveColor='rgba(190, 160, 235, 0.78)'
                  onSeek={onSeek}
                />
              )}
              currentMillisecond={+currentTime * 1000 + +lyricOffset}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pt: 0.25 }}>
            <Button
              size='small'
              variant='outlined'
              onClick={() => applyOffset(lyricOffset - OFFSET_STEP_MS)}
              data-testid='lyric-offset-back'
              sx={{ minWidth: 0, px: 1, fontSize: '0.72rem' }}
            >
              -0.5s
            </Button>
            <Typography
              variant='caption'
              data-testid='lyric-offset-value'
              sx={{ minWidth: 46, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}
            >
              {formatOffset(lyricOffset)}
            </Typography>
            <Button
              size='small'
              variant='outlined'
              onClick={() => applyOffset(lyricOffset + OFFSET_STEP_MS)}
              data-testid='lyric-offset-forward'
              sx={{ minWidth: 0, px: 1, fontSize: '0.72rem' }}
            >
              +0.5s
            </Button>
            <Button
              size='small'
              color='inherit'
              onClick={() => applyOffset(0)}
              disabled={lyricOffset === 0}
              data-testid='lyric-offset-reset'
              sx={{ minWidth: 0, px: 0.75, fontSize: '0.72rem' }}
            >
              归零
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
};

export default LyricPanel;
