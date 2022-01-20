import React, { useEffect, useState, createContext } from "react";
import PageLayout from './Layout'
import { initSongList, initFavLists } from '../background/DataProcess'
import StorageManager from '../objects/Storage'

 // Storage Manager holds setters of the program
const StorageManagerCtx = createContext()

export const App = function () {

    // The current playing list
    const [currentSongList, setCurrentSongList] = useState(null)

    useEffect(() => {
        console.log('ran useEffect - App')

        initSongList(setCurrentSongList)
    }, [])

    console.log(currentSongList)
    return (
        <StorageManagerCtx.Provider value={new StorageManager()}>
            <PageLayout
                songList={currentSongList}
            />
        </StorageManagerCtx.Provider>
    )
}

export default StorageManagerCtx

