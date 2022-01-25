import { fetchPlayUrl, fetchLRC, fetchVideoInfo } from '../utils/Data'
import { fetchPlayUrlPromise } from '../utils/Data2'
import Song from '../objects/Song'

const DEFAULT_BVID = 'BV1BQ4y1X714'

// Listens data requests, sends HTTP request to API, respond as a Player-acknowledged object.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const { command = '', from = '' } = message;
    // Init data on program start
    if (command === 'onLoadData' && from === 'App') {
        //console.log(message.command);
        initSongList({ sendResponse: sendResponse })
    }
    if (command === 'onSearch' && from === 'Search') {
        //console.log(message.command);

        getSongList({ bvid: message.bvid, sendResponse: sendResponse })
    }

    return true
})

export const initSongList = async (setCurrentSongList) => {

    // const bvid = "BV1w44y1b7MX" // Default bvid on load up --> need to load this from local later
    // const info = await fetchVideoInfo(bvid)
    // // const audioUrl = await fetchPlayUrl(bvid)
    // const lrc = await fetchLRC(info.title)
    // // const title = await fetchTitle()
    // const s = new Song(bvid, info.title, info.uploader.name, info.picSrc, () => { return fetchPlayUrlPromise(bvid) }, lrc)
    // const res = [s]
    // setCurrentSongList(res)
    // chrome.storage.sync.set({ 'Song': s }, function () {
    //     //console.log('key is set to ' + key);
    //     //console.log('Value is set to ' + value);
    // });
    chrome.storage.local.get(['LastPlayList'], async function (result) {
        if (result['LastPlayList']) {
            //console.log(result)
            const defaultSongList = result['LastPlayList']
            defaultSongList.map(v => v['musicSrc'] = () => { return fetchPlayUrlPromise(v.bvid, v.id) })
            setCurrentSongList(defaultSongList)
        }
        else {
            const defaultSongList = await getSongList(DEFAULT_BVID)
            setCurrentSongList(defaultSongList)
        }
    })
}

export const initFavLists = async (setFavSongLists) => {
    chrome.storage.sync.get(['Fav2'], function (result) {
        //console.log('Value currently is ' + result.key);
        // if(result){
        //     initWithStorage()
        // }
        // else{
        //     initWithDefault()
        // }
    });
    // const key = 'List'
    // const value = 'song'
    // chrome.storage.local.set({key: value}, function() {
    //     //console.log('key is set to ' + key);
    //     //console.log('Value is set to ' + value);
    // });
}

const isFirstTimeLoading = () => {

}
const getFirstTimeData = () => {

}

export const getSongList = async (bvid) => {
    const info = await fetchVideoInfo(bvid)
    let lrc = ""
    let songs = []

    // Case of single part video
    if (info.pages.length == 1) {
        // lrc = await fetchLRC(info.title)
        return ([new Song({
            cid: info.pages[0].cid,
            bvid: bvid,
            name: info.title,
            singer: info.uploader.name,
            singerId: info.uploader.mid,
            cover: info.picSrc,
            musicSrc: () => { return fetchPlayUrlPromise(bvid, info.pages[0].cid) },
            lyric: lrc
        })])
    }

    // Can't use forEach, does not support await
    for (let index = 0; index < info.pages.length; index++) {
        let page = info.pages[index]
        // lrc = fetchLRC(page.part)
        songs.push(new Song({
            cid: page.cid,
            bvid: bvid,
            name: page.part,
            singer: info.uploader.name,
            singerId: info.uploader.mid,
            cover: info.picSrc,
            musicSrc: () => { return fetchPlayUrlPromise(bvid, page.cid) },
            lyric: lrc
        }))
    }

    return (songs)
}

