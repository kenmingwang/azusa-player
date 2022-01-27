import React, { forwardRef, useState, useEffect,memo } from "react";
import { Lyric } from './Lyric';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import Slide from '@mui/material/Slide';

const Transition = forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

export const LyricOverlay = memo(function ({ showLyric, currentTime, audioName, audioId }) {
    const [open, setOpen] = useState(true);

    useEffect(() => {
        setOpen(!open)
    }, [showLyric])

    const handleClose = () => {
        setOpen(false);
    };

    return (
        <div>
            <Dialog
                fullScreen
                open={open}
                onClose={handleClose}
                hideBackdrop
                TransitionComponent={Transition}
            >
                <IconButton
                    edge="start"
                    color="inherit"
                    onClick={handleClose}
                    aria-label="close"
                >
                    <KeyboardArrowDownIcon />
                </IconButton>
                <Lyric currentTime={currentTime} audioName={audioName} audioId={audioId} />
            </Dialog>
        </div>
    );
})