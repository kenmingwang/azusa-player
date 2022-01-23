import { getSongList } from '../background/DataProcess'
import { v4 as uuidv4 } from 'uuid';
import { fetchPlayUrlPromise } from '../utils/Data2'

const INITIAL_PLAYLIST = 'BV1wr4y1v7TA'
const MY_FAV_LIST_KEY = 'MyFavList'

export const initFavLists = async (setFavLists) => {
    chrome.storage.local.get(['MyFavList'], function (result) {
        console.log(result);
        if (Object.keys(result).length != 0) {
            initWithStorage(setFavLists, result["MyFavList"])
        }
        else {
            chrome.storage.local.set({ 'MyFavList': [] }, async function () {
                initWithDefault(setFavLists)
            });
        }
    });
}

export const deletFavList = (id, newFavLists, setFavLists) => {
    chrome.storage.local.remove(id, function () {
        const newFavListsIds = newFavLists.map(v => v.info.id)
        chrome.storage.local.set({ [MY_FAV_LIST_KEY]: newFavListsIds }, function () {
            setFavLists(newFavLists)
        })
    })
}

export const addFavList = (favName, favLists, setFavLists) => {
    const value = {
        songList: [],
        info: { title: favName, id: ('FavList-' + uuidv4()) }
    }
    
    chrome.storage.local.set({ [value.info.id]: value }, function () {
        favLists.push(value)
        const newListIDs = favLists.map(v => v.info.id)
        setFavLists([...favLists])
        chrome.storage.local.set({ 'MyFavList': newListIDs }, function () {
            console.log('AddedFav ' + value.info.id);
        })
    });
}

const initWithStorage = async (setFavLists, FavListIDs) => {
    chrome.storage.local.get(FavListIDs, function (result) {
        let FavLists = []
        let FavListsSorted = []
        // Sort result base on ID
        for (let [key, value] of Object.entries(result)) {
            value.songList.map((v) => v['musicSrc'] = () => { return fetchPlayUrlPromise(v.bvid, v.id) })
            FavLists.push(value)

        }
        FavListIDs.map((id) => {
            FavListsSorted.push(FavLists.find((v) => v.info.id == id))
        })
        console.log(FavListsSorted)
        setFavLists(FavListsSorted)
    })
}

const initWithDefault = async (setFavLists) => {

    const value = {
        songList: await getSongList(INITIAL_PLAYLIST),
        info: { title: '默认歌单1', id: ('FavList-' + uuidv4()) }
    }

    const value2 = {
        songList: await getSongList('BV1Ya411z7WL'),
        info: { title: '默认歌单2', id: ('FavList-' + uuidv4()) }
    }

    chrome.storage.local.set({ [value.info.id]: value, [value2.info.id]: value2 }, function () {
        console.log('key is set to ' + value.info.id);
        console.log('Value is set to ' + value);
        chrome.storage.local.set({ 'MyFavList': [value.info.id, value2.info.id] }, function () {
            setFavLists([value, value2])
        })
    });
}

