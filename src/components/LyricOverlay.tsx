import React, { forwardRef, memo, useEffect, useRef } from 'react';
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
  onRequestClose?: () => void;
  currentTime: number;
  audioName: string;
  audioId?: string | number;
  audioCover: string;
  artist?: string;
}

export const LyricOverlay = memo(function ({
  showLyric,
  onRequestClose,
  currentTime,
  audioName,
  audioId,
  audioCover,
  artist = '',
}: LyricOverlayProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!showLyric) return;
    const timer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [showLyric]);

  return (
    <Dialog
      open={showLyric}
      onClose={onRequestClose}
      hideBackdrop
      disableRestoreFocus
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
          overflow: 'hidden',
        },
      }}
    >
      <div id='blur-glass' style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4px', paddingBottom: '4px' }}>
          <IconButton
            ref={closeButtonRef}
            color='inherit'
            onClick={onRequestClose}
            aria-label='close'
            sx={{
              width: '104px',
              height: '42px',
              borderRadius: '10px',
              color: '#d8c2ff',
              backgroundColor: 'transparent',
              border: '1px solid transparent',
              transition: 'background-color 120ms ease, border-color 120ms ease, box-shadow 120ms ease',
              '&:hover': {
                backgroundColor: 'rgba(120, 89, 192, 0.08)',
                borderColor: 'rgba(182, 141, 255, 0.22)',
                boxShadow: '0 0 0 1px rgba(182, 141, 255, 0.06) inset',
              },
            }}
          >
            <KeyboardArrowDownIcon />
          </IconButton>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <Lyric currentTime={currentTime} audioName={audioName} audioId={audioId} audioCover={audioCover} artist={artist} />
        </div>
      </div>
    </Dialog>
  );
});
