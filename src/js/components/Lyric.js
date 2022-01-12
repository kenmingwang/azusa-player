import React, { useEffect, useState, useCallback, useRef } from "react";
import { Lrc } from 'react-lrc';
import { ScrollBar } from "../styles/styles";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import { withStyles } from '@mui/styles';
import Grid from "@mui/material/Grid";
import { fetchLRC } from '../utils/Data'

const INTERVAL_OF_RECOVERING_AUTO_SCROLL_AFTER_USER_SCROLL = 5000;

const styles = theme => ({
    input: {
        height: 25,
        width: 120,
    }
})

export const Lyric = withStyles(styles)((props) => {

    const [lyricOffset, setLyricOffset] = useState(0)
    const [lyric, setLyric] = useState('')

    const { classes, currentTime, audioName } = props;

    useEffect(()=>{
        console.log('Lrc changed to %s', audioName )
        fetchLRC(audioName, setLyric)
    },[audioName])

    function lineRenderer({ line: { startMillisecond, content }, index, active }) {
        // console.log(content)
        return (
            <div style={{
                textAlign: 'center',
                color: active ? 'green' : 'purple',
                padding: '6px 12px',
                fontSize: active ? '18px' : '15px',
            }}>
                {content}
            </div>
        )
    }

    function onCurrentLineChange({ line, index }) {
        return (
            console.log(index, line)
        )
    }
    // console.log(+currentTime * 1000 + +lyricOffset)
    const className = ScrollBar().root

    return (
        <React.Fragment>
            <Box // Mid Grid -- Lyric 
                style={{ maxHeight: "100%", overflow: "hidden", paddingTop:'20px' }}
                sx={{ gridArea: "Lrc", padding: '0.2em'  }}
            >
                <Grid container direction="row" spacing="8" alignItems="center" justifyContent="center" >
                    <Grid  style={{paddingBottom:10}} item>
                        <TextField
                            type="number"
                            variant="outlined"
                            label="歌词补偿(毫秒)"
                            InputProps={{
                                className: classes.input,
                                min: -9999,
                                max: 9999
                            }}
                            InputLabelProps={{
                                shrink: true
                            }}
                            value={lyricOffset}
                            onChange={e => setLyricOffset(e.target.value)}
                        />
                    </Grid>
                    <Grid style={{paddingBottom:10}} item>
                        <TextField
                            variant="outlined"
                            label="歌词搜索"
                            InputProps={{
                                className: classes.input,
                            }}
                            InputLabelProps={{
                                shrink: true
                            }}
                        />
                    </Grid>
                </Grid>
                <Lrc
                    className={className}
                    style={{ maxHeight: "93%" }}
                    lrc={lyric}
                    autoScroll={true}
                    lineRenderer={lineRenderer}
                    currentMillisecond={+currentTime * 1000 + +lyricOffset} // Add offset value to adapt lrc time
                    //onLineChange={onCurrentLineChange}
                    intervalOfRecoveringAutoScrollAfterUserScroll={
                        INTERVAL_OF_RECOVERING_AUTO_SCROLL_AFTER_USER_SCROLL
                    } />
            </Box>
        </React.Fragment >
    )
})
