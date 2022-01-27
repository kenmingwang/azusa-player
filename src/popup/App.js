import React, { useEffect, useState, createContext } from "react";
import PageLayout from './Layout'
import { initSongList } from '../background/DataProcess'
import StorageManager from '../objects/Storage'

 // Persist instance of the program, manages R/W to local storage.
const StorageManagerCtx = createContext()

export const App = function () {

    // The current playing list
    const [currentSongList, setCurrentSongList] = useState(null)

    useEffect(() => {
        initSongList(setCurrentSongList)
    }, [])

    //console.log(currentSongList)
    return (
        <StorageManagerCtx.Provider value={new StorageManager()}>
            <PageLayout
                songList={currentSongList}
            />
        </StorageManagerCtx.Provider>
    )
}

export default StorageManagerCtx

