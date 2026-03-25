import React, { forwardRef, useState, useEffect, memo } from 'react';
import { Lyric } from './Lyric';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import Slide from '@mui/material/Slide';

const Transition = forwardRef(function Transition(props: any, ref: React.Ref<unknown>) {
  return <Slide direction='up' ref={ref} {...props} />;
});

interface LyricOverlayProps {
  showLyric: boolean;
  currentTime: number;
  audioName: string;
  audioId?: string | number;
  audioCover: string;
  artist?: string;
}

export const LyricOverlay = memo(function ({ showLyric, currentTime, audioName, audioId, audioCover, artist = '' }: LyricOverlayProps) {
  const [open, setOpen] = useState(showLyric);

  useEffect(() => {
    setOpen(showLyric);
  }, [showLyric]);

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      hideBackdrop
      TransitionComponent={Transition}
      sx={{
        zIndex: 900,
        pointerEvents: 'none',
        '& .MuiDialog-container': {
          alignItems: 'flex-start',
          pointerEvents: 'none',
        },
        '& .MuiPaper-root': { pointerEvents: 'auto' },
      }}
      PaperProps={{
        style: {
          backgroundImage: `url(${audioCover})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          boxShadow: 'none',
          width: '100vw',
          maxWidth: '100vw',
          height: 'calc(100dvh - 80px)',
          margin: 0,
          borderRadius: 0,
        },
      }}
    >
      <div id='blur-glass' style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
        <IconButton color='inherit' onClick={() => setOpen(false)} aria-label='close' style={{ borderRadius: '0' }}>
          <KeyboardArrowDownIcon />
        </IconButton>
        <div style={{ flex: 1, minHeight: 0 }}>
          <Lyric currentTime={currentTime} audioName={audioName} audioId={audioId} audioCover={audioCover} artist={artist} />
        </div>
      </div>
    </Dialog>
  );
});
