import ReactJkMusicPlayer from 'react-jinke-music-player'
import React, { useEffect, useState, useCallback, useContext } from "react";
import '../../css/react-jinke-player.css'
import icon from "../../img/icon-128.png"
import Box from "@mui/material/Box";
import { FavList } from '../components/FavList'
import { BiliBiliIcon } from "../../img/bilibiliIcon";
import { LyricOverlay } from './LyricOverlay'
import StorageManagerCtx from '../popup/App'

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
    // Playing List
    const [playingList, setplayingList] = useState(null)
    // Current Audio info
    const [currentAudio, setcurrentAudio] = useState(null)
    // Current Audio Inst
    const [currentAudioInst, setcurrentAudioInst] = useState(null)
    // Lyric Dialog
    const [showLyric, setShowLyric] = useState(false)
    // Sync data to chromeDB
    const StorageManager = useContext(StorageManagerCtx)

    const updateCurrentAudioList = useCallback(({ songs, immediatePlay = false, replaceList = false }) => {
        console.log("updateCurrentAudioList", params)
        let newAudioLists = []
        if (immediatePlay) {
            // Click and play
            newAudioLists = [
                ...songs,
                ...playingList,
            ]
        }
        else if (replaceList) {
            // OnPlayList handle
            newAudioLists = [...songs]
        }
        else {
            // AddToList handle
            newAudioLists =
                [
                    ...playingList,
                    ...songs,
                ]
        }
        const newParam = {
            ...params,
            quietUpdate: !immediatePlay,
            clearPriorAudioLists: immediatePlay || replaceList,
            audioLists: newAudioLists
        }
        setparams(newParam)
        setplayingList(newAudioLists)
    }, [params, playingList])

    const onPlayOneFromFav = useCallback((songs) => {

        const existingIndex = playingList.findIndex((s) => s.id == songs[0].id)
        console.log(existingIndex)
        if (existingIndex != -1) {
            currentAudioInst.playByIndex(existingIndex)
            return
        }

        updateCurrentAudioList({ songs: songs, immediatePlay: true })
    }, [params, playingList,currentAudioInst])

    const onAddOneFromFav = useCallback((songs) => {

        const existingIndex = playingList.findIndex((s) => s.id == songs[0].id)
        console.log(existingIndex)
        if (existingIndex != -1) {
            return
        }
        updateCurrentAudioList({ songs: songs, immediatePlay: false })
    }, [params, playingList])

    const onPlayAllFromFav = useCallback((songs) => {
        updateCurrentAudioList({ songs: songs, immediatePlay: false, replaceList: true })

    }, [params])

    const onAddFavToList = useCallback((songs) => {
        //If song exists in currentPlayList, remove it
        const newSongsInList = songs.filter(v => playingList.find(s => s.id == v.id) == undefined)

        updateCurrentAudioList({ songs: newSongsInList, immediatePlay: false, replaceList: false })
    }, [params, playingList])

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

    const onAudioListsChange = useCallback((currentPlayId, audioLists, audioInfo) => {
        // Sync latest-playinglist
        StorageManager.setLastPlayList(audioLists)
        setplayingList(audioLists)
        console.log('audioListChange:', audioLists)
    }, [params, playingList])

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
        console.log('getAudioInstance', audio)
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

        let link = ''
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
        setplayingList(songList)
    }, [songList])

    // console.log('params')
    // console.log(params)
    // console.log('lyric' + lyric)
    // console.log(currentAudio)
    return (
        <React.Fragment>
            {params && <FavList currentAudioList={params.audioLists}
                onSongIndexChange={playByIndex}
                onPlayOneFromFav={onPlayOneFromFav}
                onPlayAllFromFav={onPlayAllFromFav}
                onAddFavToList={onAddFavToList}
                onAddOneFromFav={onAddOneFromFav}
            />}
            {currentAudio && <LyricOverlay
                showLyric={showLyric}
                currentTime={currentAudio.currentTime}
                audioName={currentAudio.name}
                audioId={currentAudio.id} />}

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
                            onAudioListsChange={onAudioListsChange}
                        />
                    </Box>
                </React.Fragment>}
        </React.Fragment>
    )
}