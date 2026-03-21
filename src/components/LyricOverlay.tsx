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
  audioId: string;
  audioCover: string;
  artist?: string;
}

export const LyricOverlay = memo(function ({ showLyric, currentTime, audioName, audioId, audioCover, artist = '' }: LyricOverlayProps) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    setOpen((v) => !v);
  }, [showLyric]);

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={() => setOpen(false)}
      hideBackdrop
      TransitionComponent={Transition}
      PaperProps={{
        style: {
          backgroundImage: `url(${audioCover})`,
          backgroundSize: 'cover',
          boxShadow: 'none',
        },
      }}
    >
      <div id='blur-glass' style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <IconButton color='inherit' onClick={() => setOpen(false)} aria-label='close' style={{ borderRadius: '0' }}>
          <KeyboardArrowDownIcon />
        </IconButton>
        <Lyric currentTime={currentTime} audioName={audioName} audioId={audioId} audioCover={audioCover} artist={artist} />
      </div>
    </Dialog>
  );
});
