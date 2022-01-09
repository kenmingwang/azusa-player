import ReactJkMusicPlayer from 'react-jinke-music-player'
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { hot } from "react-hot-loader";
import { ScrollBar } from "../styles/styles";
import '../../css/react-jinke-player.css'
import icon from "../../img/icon-128.png"
import lrc from "../../img/lrc.txt"
import Box from "@mui/material/Box";
import { saveAs } from 'file-saver';
import { Lyric } from './Lyric'
import { FavList } from '../components/FavList'
import { Search } from '../components/Search'
import LinearProgress from '@mui/material/LinearProgress';

// Initial Player options
const options = {
    mode: 'full',
    defaultVolume: 0.5,
    showThemeSwitch: false,
    showLyric: false,
    toggleMode: false,
    locale: 'zh_CN'
}

export const Player = function ({ songList }) {

    // Params to init music player
    const [params, setparams] = useState(null)

    // Current Lyric
    const [lyric, setLyric] = useState('')

    // Current Audio info
    const [currentAudio, setcurrentAudio] = useState(null)

    // Current Audio Inst
    const [currentAudioInst, setcurrentAudioInst] = useState(null)
    // The only list that will be played
    const [defaultSongList, setDefaultSongList] = useState([])
    // The persistent songLists that will be stored locally.
    const [userSongList, setUserSongList] = useState([])
    const [currentAudioList, setcurrentAudioList] = useState([])

    const onSearchTrigger = (song) => {
        console.log("onSearchTrigger", params)
        const newParam = {
            quietUpdate: true,
            ...params,
            audioLists: [
                ...params.audioLists,
                ...song
            ]
        }
        setparams(newParam)
        setcurrentAudioList(newParam.audioLists)
    }

    const playByIndex = useCallback((index) => {
        currentAudioInst.playByIndex(index)
    }, [currentAudioInst])


    const onAudioError = (errMsg, currentPlayId, audioLists, audioInfo) => {
        console.error('audio error', errMsg, currentPlayId, audioLists, audioInfo)
    }

    const onAudioProgress = (audioInfo) => {
        //console.log('onAudioProgress: ', audioInfo)
        //console.log(currentAudioInst && currentAudioInst.currentTime)
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

    // Initialization effect
    useEffect(() => {
        console.log('ran Init useEffect - Player')
        if (!songList)
            return;

        setLyric(songList[0].lyric)

        const params = {
            ...options,
            audioLists: songList
        }
        setparams(params)
        setcurrentAudioList(params.audioLists)
    }, [songList])

    // console.log('params')
    // console.log(params)
    // console.log('lyric' + lyric)
    // console.log(currentAudio && currentAudio.currentTime)
    return (
        <React.Fragment>
            <Box // Mid Grid -- SideBar
                className={ScrollBar().root}
                style={{ overflow: "auto" }}
                sx={{ gridArea: "sidebar" }}
            >
                {currentAudioList && <FavList currentAudioList={currentAudioList}
                    onSongIndexChange={playByIndex}
                />}
            </Box>
            {currentAudio && <Lyric lyric={lyric} currentTime={currentAudio.currentTime} />}
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
                            quietUpdate={true}
                            onAudioError={onAudioError}
                            customDownloader={customDownloader}
                            showMediaSession
                            {...params}
                            onAudioProgress={onAudioProgress}
                            getAudioInstance={getAudioInstance}
                        />
                    </Box>
                </React.Fragment>}
        </React.Fragment>
    )
}