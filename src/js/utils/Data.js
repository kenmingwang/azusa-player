import { Logger } from "./Logger"
import VideoInfo from "../objects/VideoInfo"

const logger = new Logger("Data.js")

// Video src info
const URL_PLAY_URL = "https://api.bilibili.com/x/player/playurl?cid={cid}&bvid={bvid}&qn=64&fnval=16"
// BVID -> CID
const URL_BVID_TO_CID = "https://api.bilibili.com/x/player/pagelist?bvid={bvid}&jsonp=jsonp"
// Video Basic Info
const URL_VIDEO_INFO = "http://api.bilibili.com/x/web-interface/view?bvid={bvid}"
// LRC Mapping
const URL_LRC_MAPPING = "https://raw.githubusercontent.com/kenmingwang/azusa-player-lrcs/main/mappings.txt"
// LRC Base
const URL_LRC_BASE = "https://raw.githubusercontent.com/kenmingwang/azusa-player-lrcs/main/{songFile}"

export const fetchPlayUrl = async (bvid) => {
    // Fetch cid from bvid
    const cid = await fetchCID(bvid)

    console.log('Data.js Calling fetchPlayUrl:' + URL_PLAY_URL.replace("{bvid}", bvid).replace("{cid}", cid))
    const res = await fetch(URL_PLAY_URL.replace("{bvid}", bvid).replace("{cid}", cid))
    const json = await res.json()
    const audioUrl = extractResponseJson(json, 'AudioUrl')

    return audioUrl
}


export const fetchCID = async (bvid) => {
    console.log('Data.js Calling fetchCID:' + URL_BVID_TO_CID.replace("{bvid}", bvid))
    const res = await fetch(URL_BVID_TO_CID.replace("{bvid}", bvid))
    const json = await res.json()
    const cid = extractResponseJson(json, 'CID')
    return cid
}

// Refactor needed for this func
export const fetchLRC = async (name) => {
    console.log('Data.js Calling: fetchLRC')
    // Get song mapping name and song name from title
    const res = await fetch(URL_LRC_MAPPING)
    const mappings = await res.text()
    const songs = mappings.split("\n")
    const songName = extractSongName(name)

    const songFile = songs.find((v,i,a)=> v.includes(songName))
    // use song name to get the LRC
    const lrc = await fetch(URL_LRC_BASE.replace('{songFile}',songFile))
    const text = await lrc.text()
    return text.replaceAll('\r\n', '\n')
}

export const fetchVideoInfo = async (bvid) => {
    logger.info("calling fetchVideoInfo")
    const res = await fetch(URL_VIDEO_INFO.replace('{bvid}', bvid))
    const json = await res.json()
    const data = json.data
    const v = new VideoInfo(
        data.title,
        data.desc,
        data.videos,
        data.pic,
        data.owner,
        data.pages.map((s)=>{return({part:s.part,cid:s.cid})}))
    return v
}

// Private Util to extract json according to https://github.com/SocialSisterYi/bilibili-API-collect
const extractResponseJson = (json, field) => {
    if (field === 'AudioUrl') {
        return json.data.dash.audio[0].baseUrl
    } else if (field === 'CID') {
        return json.data[0].cid
    } else if (field == 'AudioInfo') {
        return {}
    }
}

const extractSongName = (name) => {
    var nameReg = new RegExp("《.*》"); // For single-list BVID
    const res = nameReg.exec(name)
    return(res.length > 0 ? res[0].substring(1,res[0].length-1) : "") // Remove the brackets
}