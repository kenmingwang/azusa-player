import { getSongList } from '../background/DataProcess'
import { v4 as uuidv4 } from 'uuid';
import { fetchPlayUrlPromise } from '../utils/Data2'

const INITIAL_PLAYLIST = 'BV1wr4y1v7TA'
const MY_FAV_LIST_KEY = 'MyFavList'

export default class StorageManager {
    constructor() {
        this.setFavLists = () => { }
        this.latestFavLists = []
    }

    async initFavLists() {
        const _self = this
        chrome.storage.local.get(['MyFavList'], function (result) {
            console.log(result);
            if (Object.keys(result).length != 0) {
                _self.initWithStorage(result["MyFavList"])
            }
            else {
                chrome.storage.local.set({ 'MyFavList': [] }, async function () {
                    _self.initWithDefault()
                });
            }
        });
    }

    async initWithStorage(FavListIDs) {
        const _self = this
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
            _self.setFavLists(FavListsSorted)
            _self.latestFavLists = FavListsSorted
        })
    }

    async initWithDefault() {
        const _self = this
        const value = {
            songList: await getSongList(INITIAL_PLAYLIST),
            info: { title: '【阿梓】2021精选翻唱50首【纯享】', id: ('FavList-' + uuidv4()) }
        }

        // const value2 = {
        //     songList: await getSongList('BV1Ya411z7WL'),
        //     info: { title: '默认歌单2', id: ('FavList-' + uuidv4()) }
        // }[value2.info.id]: value2,

        chrome.storage.local.set({ [value.info.id]: value, ['LastPlayList']:[] }, function () {
            console.log('key is set to ' + value.info.id);
            console.log('Value is set to ' + value);
            chrome.storage.local.set({ 'MyFavList': [value.info.id] }, function () {
                _self.setFavLists([value])
                _self.latestFavLists = [value]
            })
        });
    }

    deletFavList(id, newFavLists) {
        const _self = this
        chrome.storage.local.remove(id, function () {
            const newFavListsIds = newFavLists.map(v => v.info.id)
            chrome.storage.local.set({ [MY_FAV_LIST_KEY]: newFavListsIds }, function () {
                _self.setFavLists(newFavLists)
                _self.latestFavLists = newFavLists
            })
        })
    }

    addFavList(favName) {
        const _self = this
        const value = {
            songList: [],
            info: { title: favName, id: ('FavList-' + uuidv4()) }
        }

        chrome.storage.local.set({ [value.info.id]: value }, function () {
            _self.latestFavLists.push(value)
            const newListIDs = _self.latestFavLists.map(v => v.info.id)
            chrome.storage.local.set({ 'MyFavList': newListIDs }, function () {
                _self.setFavLists([..._self.latestFavLists])

                console.log('AddedFav ' + value.info.id);
            })
        });
    }

    updateFavList(updatedToList) {
        const _self = this

        chrome.storage.local.set({ [updatedToList.info.id]: updatedToList }, function () {
            const index = _self.latestFavLists.findIndex(f => f.info.id == updatedToList.info.id)
            _self.latestFavLists[index].songList = updatedToList.songList
            _self.setFavLists([..._self.latestFavLists])
        });
    }

    setLastPlayList(audioLists) {
        chrome.storage.local.set({ ['LastPlayList']: audioLists })
    }

    async getLastPlayList() {
        let lastPlayList = []
        await chrome.storage.local.get({ ['LastPlayList']: audioLists }, function(result){
            lastPlayList = result
        })
        console.log(lastPlayList)
        return lastPlayList
    }
}




