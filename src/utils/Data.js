import { Logger } from "./Logger"
import VideoInfo from "../objects/VideoInfo"

const logger = new Logger("Data.js")

// Video src info
const URL_PLAY_URL = "https://api.bilibili.com/x/player/playurl?cid={cid}&bvid={bvid}&qn=64&fnval=16"
// BVID -> CID
const URL_BVID_TO_CID = "https://api.bilibili.com/x/player/pagelist?bvid={bvid}&jsonp=jsonp"
// Video Basic Info
const URL_VIDEO_INFO = "http://api.bilibili.com/x/web-interface/view?bvid={bvid}"
// channel series API Extract Info
const URL_BILISERIES_INFO = "https://api.bilibili.com/x/series/archives?mid={mid}&series_id={sid}&only_normal=true&sort=desc&pn={pn}&ps=30"
// Fav List
const URL_FAV_LIST = "https://api.bilibili.com/x/v3/fav/resource/list?media_id={mid}&pn={pn}&ps=20&keyword=&order=mtime&type=0&tid=0&platform=web&jsonp=jsonp"
// LRC Mapping
const URL_LRC_MAPPING = "https://raw.githubusercontent.com/kenmingwang/azusa-player-lrcs/main/mappings.txt"
// LRC Base
const URL_LRC_BASE = "https://raw.githubusercontent.com/kenmingwang/azusa-player-lrcs/main/{songFile}"
// Header GIF base
const URL_HEADER_GIF = "https://github.com/kenmingwang/azusa-player-lrcs/blob/main/aziRandomPic/{count}.gif?raw=true"
// HEADER GIFs count: https://github.com/kenmingwang/azusa-player-lrcs/tree/main/aziRandomPic
const COUNT_HEADER_GIFS = 12
// QQ SongSearch API
const URL_QQ_SEARCH = "https://c.y.qq.com/splcloud/fcgi-bin/smartbox_new.fcg?key={KeyWord}"
// QQ LyricSearchAPI
const URL_QQ_LYRIC = "https://i.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?songmid={SongMid}&g_tk=5381&format=json&inCharset=utf8&outCharset=utf-8&nobase64=1"

export const fetchPlayUrlPromise = async (bvid, cid, isBackup=false) => {
    // Fetch cid from bvid if needed
    if (!cid)
        cid = await fetchCID(bvid).catch((err) => console.log(err))

    // Returns a promise that resolves into the audio stream url
    return (new Promise((resolve, reject) => {
        // console.log('Data.js Calling fetchPlayUrl:' + URL_PLAY_URL.replace("{bvid}", bvid).replace("{cid}", cid))
        chrome.storage.local.get(['CurrentPlaying','PlayerSetting'], function (result) {
            // To prohibit current playing audio from fetching a new audio stream
            // If single loop, retreive the promise again.
            if (result.CurrentPlaying && result.CurrentPlaying.cid == cid && result.PlayerSetting.playMode != 'singleLoop'){
                resolve(result.playUrl)
            }
            else {
                fetch(URL_PLAY_URL.replace("{bvid}", bvid).replace("{cid}", cid))
                    .then(res => res.json())
                    .then(json => resolve(extractResponseJson(json, 'AudioUrl', isBackup)))
                    .catch((err) => reject(console.log(err)))
            }
        })
    }));
}

export const fetchCID = async (bvid) => {
    //console.log('Data.js Calling fetchCID:' + URL_BVID_TO_CID.replace("{bvid}", bvid))
    const res = await fetch(URL_BVID_TO_CID.replace("{bvid}", bvid))
    const json = await res.json()
    const cid = extractResponseJson(json, 'CID')
    return cid
}

// Refactor needed for this func
export const fetchLRC = async (name, setLyric, setSongTitle) => {
    //console.log('Data.js Calling: fetchLRC')
    // Get song mapping name and song name from title
    const res = await fetch(URL_LRC_MAPPING)
    const mappings = await res.text()
    const songs = mappings.split("\n")
    const songName = extractSongName(name)
    setSongTitle(songName)

    const songFile = songs.find((v, i, a) => v.includes(songName))
    // use song name to get the LRC
    try {
        const lrc = await fetch(URL_LRC_BASE.replace('{songFile}', songFile))
        if (lrc.status != '200') {
            setLyric('[00:00.000] 无法找到歌词')
            return
        }

        const text = await lrc.text()
        setLyric(text.replaceAll('\r\n', '\n'))
        return text.replaceAll('\r\n', '\n')
    } catch (error) {
        setLyric('[00:00.000] 无法找到歌词')
        return
    }

}

export const fetchVideoInfo = async (bvid) => {
    logger.info("calling fetchVideoInfo")
    const res = await fetch(URL_VIDEO_INFO.replace('{bvid}', bvid))
    const json = await res.json()
    try {
        const data = json.data
        const v = new VideoInfo(
            data.title,
            data.desc,
            data.videos,
            data.pic,
            data.owner,
            data.pages.map((s) => { return ({ bvid: bvid, part: s.part, cid: s.cid }) }))
        return v
    } catch (error) {
        console.log('Some issue happened when fetching', bvid)
    }
}

// fetch biliseries. copied from yt-dlp.
// use page = 0 will return all videos in the list; else use a page number 
// and # of items in a page (ps; defualt 30)
// since we have no point of queuing it page by page, its easier to just 
// load everything by using page = 0
export const fetchBiliSeriesInfo = async (mid, sid) => {
    logger.info("calling fetchBiliSeriesInfo")
    let page = 0
    let res = await fetch(URL_BILISERIES_INFO.replace('{mid}', mid).replace('{sid}', sid).replace('{pn}', page))
    let json = await res.json()
    let data = json.data
    
    const BVidPromises = []
    for (let i = 0; i < data.archives.length; i++) {
        BVidPromises.push(fetchVideoInfo(data.archives[i].bvid))
    }

    let videoInfos = []
    await Promise.all(BVidPromises).then(res => {
        videoInfos = res
    })
    return videoInfos
}

export const fetchFavList = async (mid) => {
    logger.info("calling fetchFavList")
    const res = await fetch(URL_FAV_LIST.replace('{mid}', mid).replace('{pn}', 1))
    const json = await res.json()
    const data = json.data

    const mediaCount = data.info.media_count
    let totalPagesRequired = 1 + Math.floor(mediaCount / 20)

    const BVidPromises = data.medias.map(m => fetchVideoInfo(m.bvid))
    const pagesPromises = []

    for (let page = 2; page <= totalPagesRequired; page++) {
        pagesPromises.push(fetch(URL_FAV_LIST.replace('{mid}', mid).replace('{pn}', page)))
    }

    let videoInfos = []
    await Promise.all(pagesPromises)
        .then(async function (v) {
            // console.log(BVidPromises)
            for (let index = 0; index < v.length; index++) {
                await v[index].json().then(js => js.data.medias.map(m => BVidPromises.push(fetchVideoInfo(m.bvid))))
            }

            await Promise.all(BVidPromises).then(res => {
                videoInfos = res
            })
        })

    return videoInfos
}

// Private Util to extract json according to https://github.com/SocialSisterYi/bilibili-API-collect
const extractResponseJson = (json, field, isBackup=false) => {
    if (field === 'AudioUrl') {
        if(isBackup)
            return json.data.dash.audio[0].backupUrl[0]
        else
            return json.data.dash.audio[0].baseUrl
    } else if (field === 'CID') {
        return json.data[0].cid
    } else if (field == 'AudioInfo') {
        return {}
    }
}

export const extractSongName = (name) => {
    const nameReg = new RegExp("《.*》"); // For single-list BVID, we need to extract name from title
    const res = nameReg.exec(name)
    if (res)
        return (res.length > 0 ? res[0].substring(1, res[0].length - 1) : "") // Remove the brackets

    // var nameReg = /[ `!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/ // Check if name is just one string, no special chars
    // if(!nameReg.test(name))
    return (name)
}

export const getRandomHeaderGIF = () => {
    return URL_HEADER_GIF.replace('{count}', Math.floor(Math.random() * COUNT_HEADER_GIFS))
}

export const searchLyricOptions = async (searchKey, setOptions, setLyric) => {
    logger.info("calling searchLyricOptions")
    if (searchKey == "") {
        setOptions([])
        return
    }
    const res = await fetch(URL_QQ_SEARCH.replace("{KeyWord}", searchKey))
    const json = await res.json()
    const data = json.data.song.itemlist
    const slimData = data.map((s, v) => { return { key: s.mid, songMid: s.mid, label: v + '. ' + s.name + ' / ' + s.singer } })

    setOptions(slimData)
}

export const searchLyric = async (searchMID, setLyric) => {
    logger.info("calling searchLyric")
    const res = await fetch(URL_QQ_LYRIC.replace("{SongMid}", searchMID))
    const json = await res.json()
    if (!json.lyric) {
        setLyric('[00:00.000] 无法找到歌词,请手动搜索')
        return
    }

    let finalLrc = json.lyric

    // Merge trans Lyrics
    if( json.trans )
        finalLrc = json.trans + '\n' +  finalLrc
    
    // console.log(finalLrc)
    setLyric(finalLrc)
}