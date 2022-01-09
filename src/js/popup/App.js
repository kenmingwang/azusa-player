import React, { useEffect, useState } from "react";
import PageLayout from './Layout'
import URLParse from 'url-parse';
import { initSongList, initFavLists } from '../background/DataProcess'
import Song from '../objects/Song'

export const App = function () {

    // The current playing list
    const [currentSongList, setCurrentSongList] = useState(null)

    // The persisted fav Lists -- CRUD via Chrome.sync
    const [favSongLists, setFavSongLists] = useState([])

    useEffect(() => {
        console.log('ran useEffect - App')

        initSongList(setCurrentSongList)
    }, [])

    console.log(currentSongList)
    return (
        <React.Fragment>
            <PageLayout
                songList={currentSongList}
            />
        </React.Fragment>
    )
}

