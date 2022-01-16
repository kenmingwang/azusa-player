import ReactJkMusicPlayer from 'react-jinke-music-player'
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { hot } from "react-hot-loader";

import '../../css/react-jinke-player.css'
import icon from "../../img/icon-128.png"
import lrc from "../../img/lrc.txt"
import Box from "@mui/material/Box";
import { saveAs } from 'file-saver';
import { Lyric } from './Lyric'
import { FavList } from '../components/FavList'
import { Search } from '../components/Search'
import LinearProgress from '@mui/material/LinearProgress';
import { BiliBiliIcon } from "../../img/bilibiliIcon";
import { LyricOverlay } from './LyricOverlay'

// Initial Player options
const options = {
    mode: 'full',
    defaultVolume: 0.5,
    showThemeSwitch: false,
    showLyric: false,
    toggleMode: false,
    locale: 'zh_CN',
    autoPlayInitLoadPlayList: true,
    autoPlay: false,
    defaultPlayIndex: 0
}

export const Player = function ({ songList }) {

    // Params to init music player
    const [params, setparams] = useState(null)
    // Current Audio info
    const [currentAudio, setcurrentAudio] = useState(null)
    // Current Audio Inst
    const [currentAudioInst, setcurrentAudioInst] = useState(null)
    // Lyric Dialog
    const [showLyric, setShowLyric] = useState(false)

    const updateCurrentAudioList = useCallback(({ song, immediatePlay }) => {
        console.log("updateCurrentAudioList", params)

        const newParam = {
            ...params,
            quietUpdate: !immediatePlay,
            clearPriorAudioLists: immediatePlay,
            audioLists: immediatePlay ?
                [
                    ...song,
                    ...params.audioLists,
                ] :
                [
                    ...params.audioLists,
                    ...song,
                ]
        }
        setparams(newParam)
    }, [params])

    const onSearchTrigger = useCallback((song) => {
        updateCurrentAudioList({ song: song, immediatePlay: false })
    }, [params])

    const onPlayOneFromFav = useCallback((song) => {

        const existingIndex = params.audioLists.findIndex((s) => s.id == song[0].id)
        console.log(existingIndex)
        if (existingIndex != -1) {
            currentAudioInst.playByIndex(existingIndex)
            return
        }

        updateCurrentAudioList({ song: song, immediatePlay: true })
    }, [params])

    const playByIndex = useCallback((index) => {
        currentAudioInst.playByIndex(index)
    }, [currentAudioInst])

    const onAudioPlay = useCallback((audioInfo) => {
        console.log('audio playing', audioInfo)
        const link = 'https://www.bilibili.com/video/' + audioInfo.bvid
        const newParam = {
            ...params,
            extendsContent: (
                <span className="group audio-download" title="Bilibili">
                    <a href={link} target="_blank" style={{ color: 'inherit', textDecloration: 'none' }}>
                        <BiliBiliIcon />
                    </a>
                </span >
            )
        }
        setparams(newParam)
    }, [params])

    const onAudioError = (errMsg, currentPlayId, audioLists, audioInfo) => {
        console.error('audio error', errMsg, currentPlayId, audioLists, audioInfo)
    }

    const onAudioProgress = (audioInfo) => {
        //console.log('onAudioProgress: ', audioInfo)
        // console.log(audioInfo)
        setcurrentAudio(audioInfo)
    }

    const getAudioInstance = (audio) => {
        setcurrentAudioInst(audio)
    }

    const customDownloader = (downloadInfo) => {
        fetch(downloadInfo.src)
            .then(res => {
                return res.blob();
            }).then(blob => {
                const href = window.URL.createObjectURL(blob);
                const link = document.createElement('a')
                link.href = href // a.mp3
                link.download = currentAudioInst.title + '.mp3'
                document.body.appendChild(link)
                link.click()
            }).catch(err => console.error(err));
    }
    const onCoverClick = (mode, audioLists, audioInfo) => {
        setShowLyric(!showLyric)
    }

    // Initialization effect
    useEffect(() => {
        console.log('ran Init useEffect - Player')
        if (!songList)
            return;

        var link = ''
        if (songList[0] != undefined)
            link = 'https://www.bilibili.com/video/' + songList[0].bvid
        options.extendsContent = (
            <span className="group audio-download" title="Bilibili">
                <a href={link} target="_blank" style={{ color: 'inherit', textDecloration: 'none' }}>
                    <BiliBiliIcon />
                </a>
            </span >
        )
        const params = {
            ...options,
            audioLists: songList
        }
        setparams(params)

    }, [songList])

    // console.log('params')
    // console.log(params)
    // console.log('lyric' + lyric)
    // console.log(currentAudio && currentAudio.currentTime)
    return (
        <React.Fragment>
            {params && <FavList currentAudioList={params.audioLists}
                onSongIndexChange={playByIndex}
                onPlayOneFromFav={onPlayOneFromFav}
            // onPlayAllFromFav
            />}
            {currentAudio && <LyricOverlay
                showLyric={showLyric}
                currentTime={currentAudio.currentTime}
                audioName={currentAudio.name} />}
            <Search onSearchTrigger={onSearchTrigger} />
            {params &&
                <React.Fragment>
                    <Box // Bottom Grid -- Footer
                        display="flex"
                        flex="1"
                        justifyContent="space-around"
                        style={{ maxHeight: "100%", height: "64px" }} // Relative height against the Player
                        sx={{ gridArea: "footer" }}
                    >
                        <ReactJkMusicPlayer
                            onAudioError={onAudioError}
                            customDownloader={customDownloader}
                            showMediaSession
                            {...params}
                            onAudioProgress={onAudioProgress}
                            getAudioInstance={getAudioInstance}
                            onAudioPlay={onAudioPlay}
                            onCoverClick={onCoverClick}
                        />
                    </Box>
                </React.Fragment>}
        </React.Fragment>
    )
}