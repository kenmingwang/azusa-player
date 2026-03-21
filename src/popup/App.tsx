import React, { useEffect, useState, createContext } from "react";
import PageLayout from './Layout';
import { initSongList } from '../background/DataProcess';
import StorageManager from '../objects/Storage';
import { SongProps } from '../objects/Song';

 // Persist instance of the program, manages R/W to local storage.
const StorageManagerCtx = createContext<StorageManager>(StorageManager.getInstance());

export const App = function () {

    // The current playing list
    const [currentSongList, setCurrentSongList] = useState<any>(null); // TODO: Type this propertly with Song[]

    useEffect(() => {
        initSongList(setCurrentSongList);
    }, []);

    //console.log(currentSongList)
    return (
        <StorageManagerCtx.Provider value={StorageManager.getInstance()}>
            <PageLayout
                songList={currentSongList}
            />
        </StorageManagerCtx.Provider>
    )
}

export default StorageManagerCtx;
