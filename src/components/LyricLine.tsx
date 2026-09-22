import React from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

export interface LyricLineProps {
  content: string;
  active: boolean;
  startMillisecond: number;
  /** Lyric timing offset in ms (views add it to the playback time). */
  offset?: number;
  fontSize: number;
  activeColor: string;
  inactiveColor: string;
  /** When provided, hovering the line reveals a play button that jumps the audio to this line. */
  onSeek?: (seconds: number) => void;
}

const SIDE_SLOT = 26;

const formatClock = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${minutes}:${String(rest).padStart(2, '0')}`;
};

/**
 * One lyric line: the text stays centred whether or not the jump button is visible, because the
 * button lives in a fixed-width slot. react-lrc measures this node to centre the active line.
 */
export const LyricLine = ({
  content,
  active,
  startMillisecond,
  offset = 0,
  fontSize,
  activeColor,
  inactiveColor,
  onSeek,
}: LyricLineProps) => {
  const seconds = Math.max(0, (Number(startMillisecond) - Number(offset)) / 1000);
  const color = active ? activeColor : inactiveColor;

  return (
    <Box
      className='azusa-lyric-line'
      data-testid='lyric-line'
      data-active={active ? 'true' : 'false'}
      data-start-millisecond={Number(startMillisecond)}
      sx={{
        display: 'flex',
        alignItems: 'center',
        mx: 'auto',
        maxWidth: 680,
        '& .azusa-lyric-jump': { opacity: 0, transition: 'opacity 120ms ease' },
        '&:hover .azusa-lyric-jump, &:focus-within .azusa-lyric-jump': { opacity: 1 },
      }}
    >
      <Box aria-hidden='true' sx={{ flex: `0 0 ${SIDE_SLOT}px`, width: SIDE_SLOT }} />
      <Box
        component='span'
        data-testid='lyric-line-content'
        sx={{
          flex: 1,
          minWidth: 0,
          textAlign: 'center',
          color,
          fontSize: `${active ? fontSize + 3 : fontSize}px`,
          fontWeight: active ? 700 : 500,
          lineHeight: 1.82,
          letterSpacing: active ? '0.02em' : '0.01em',
          fontFamily: "'Microsoft YaHei', 'PingFang SC', 'Noto Serif SC', Georgia, serif",
          padding: active ? '10px 4px' : '8px 4px',
        }}
      >
        {content}
      </Box>
      {onSeek ? (
        <Tooltip title={`跳转到这句（${formatClock(seconds)}）`}>
          <IconButton
            className='azusa-lyric-jump'
            size='small'
            data-testid='lyric-line-jump'
            aria-label={`跳转到这句歌词：${content}`}
            onClick={() => onSeek(seconds)}
            sx={{ flex: `0 0 ${SIDE_SLOT}px`, width: SIDE_SLOT, height: SIDE_SLOT, color }}
          >
            <PlayArrowIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      ) : (
        <Box aria-hidden='true' sx={{ flex: `0 0 ${SIDE_SLOT}px`, width: SIDE_SLOT }} />
      )}
    </Box>
  );
};

export default LyricLine;
