import { Logger } from "./Logger"
import VideoInfo from "../objects/VideoInfo"

const logger = new Logger("Data.js")

// Video src info
const URL_PLAY_URL = "https://api.bilibili.com/x/player/playurl?cid={cid}&bvid={bvid}&qn=64&fnval=16"
// BVID -> CID
const URL_BVID_TO_CID = "https://api.bilibili.com/x/player/pagelist?bvid={bvid}&jsonp=jsonp"
// Video Basic Info
const URL_VIDEO_INFO = "http://api.bilibili.com/x/web-interface/view?bvid={bvid}"

export const fetchPlayUrl = async (bvid: string) => {
    // Fetch cid from bvid
    const cid = await fetchCID(bvid)

    console.log('Data.js Calling fetchPlayUrl:' + URL_PLAY_URL.replace("{bvid}", bvid).replace("{cid}", cid))
    const res = await fetch(URL_PLAY_URL.replace("{bvid}", bvid).replace("{cid}", cid))
    const json = await res.json()
    const audioUrl = extractResponseJson(json, 'AudioUrl')

    console.log('fetchPlayUrl:' + audioUrl)
    return (new Promise((resolve, reject) => {
        let a1 = audioUrl;
        let a2 = bvid;
        let timer = setTimeout(function () {
            console.log('after resolve');
            resolve(a1);
            reject(a2);
            console.log('after error');
        }, 1000);
    }));
}


export const fetchPlayUrlC = async () => {
    // Fetch cid from bvid
    const cid = await fetchCID('BV1gi4y1d7aC')

    console.log('Data.js Calling fetchPlayUrl:' + URL_PLAY_URL.replace("{bvid}", 'BV1gi4y1d7aC').replace("{cid}", cid))
    const res = await fetch(URL_PLAY_URL.replace("{bvid}", 'BV1gi4y1d7aC').replace("{cid}", cid))
    const json = await res.json()
    const audioUrl = extractResponseJson(json, 'AudioUrl')

    console.log('fetchPlayUrl:' + audioUrl)
    return (new Promise((resolve, reject) => {
        let a1 = audioUrl;
        let a2 = 'bvid';
        let timer = setTimeout(function () {
            console.log('after resolve');
            resolve(a1);
            reject(a2);
            console.log('after error');
        }, 1000);
    }));
}


export const fetchCID = async (bvid: string) => {
    console.log('Data.js Calling fetchCID:' + URL_BVID_TO_CID.replace("{bvid}", bvid))
    const res = await fetch(URL_BVID_TO_CID.replace("{bvid}", bvid))
    const json = await res.json()
    const cid = extractResponseJson(json, 'CID')
    return cid
}

export const fetchLRC = async (name:any) => {
    console.log('Data.js Calling: fetchLRC')
    const res = await fetch('./lrc.txt')
    const text = await res.text()
    return text.replaceAll('\r\n', '\n')
}

export const fetchVideoInfo = async (bvid: string) => {
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
        data.pages.map((s:any) => { return ({ part: s.part, cid: s.cid }) }))
    return v
}

// Private Util to extract json according to https://github.com/SocialSisterYi/bilibili-API-collect
const extractResponseJson = (json: any, field: string) => {
    if (field === 'AudioUrl') {
        return json.data.dash.audio[0].baseUrl
    } else if (field === 'CID') {
        return json.data[0].cid
    } else if (field == 'AudioInfo') {
        return {}
    }
}
export const fetchPlayUrlPromise = async (bvid: string, cid?: string): Promise<string> => {
    // Fetch cid from bvid
    if(!cid)
        cid = await fetchCID(bvid)

    console.log('Data.js Calling fetchPlayUrl:' + URL_PLAY_URL.replace("{bvid}", bvid).replace("{cid}", cid))
    const res = await fetch(URL_PLAY_URL.replace("{bvid}", bvid).replace("{cid}", cid))
    const json = await res.json()
    const audioUrl = extractResponseJson(json, 'AudioUrl')
    console.log(audioUrl)
    // const audioUrl = 'https://upos-hz-mirrorakam.akamaized.net/upgcxcode/36/17/461821736/461821736_nb2-1-30280.m4s?e=ig8euxZM2rNcNbdlhoNvNC8BqJIzNbfqXBvEqxTEto8BTrNvN0GvT90W5JZMkX_YN0MvXg8gNEV4NC8xNEV4N03eN0B5tZlqNxTEto8BTrNvNeZVuJ10Kj_g2UB02J0mN0B5tZlqNCNEto8BTrNvNC7MTX502C8f2jmMQJ6mqF2fka1mqx6gqj0eN0B599M=&uipk=5&nbs=1&deadline=1639989193&gen=playurlv2&os=akam&oi=1754218863&trid=e8e5d222b7194d2f84c4841624f86c29u&platform=pc&upsig=8ce8f119ed478e1bc432f3ead9f9cab8&uparams=e,uipk,nbs,deadline,gen,os,oi,trid,platform&hdnts=exp=1639989193~hmac=652ed834ee6959194177c1887d2cf15399894172aa4781dfebdcc939aaf77f81&mid=1989881&bvc=vod&nettype=0&orderid=0,1&agrr=1&bw=40346&logo=80000000'
    // console.log('Data.js Calling fetchPlayUrl:')
    return (new Promise((resolve, reject) => {
        let a1 = audioUrl;
        let a2 = bvid;
        resolve(a1);
    }));
}

export const fetchPlayUrlPromiseMulti = async (bvid: string, cid?: string): Promise<string> => {
    // Fetch cid from bvid
    if(!cid)
        cid = await fetchCID(bvid)

    console.log('Data.js Calling fetchPlayUrl:' + URL_PLAY_URL.replace("{bvid}", bvid).replace("{cid}", cid))
    const res = await fetch(URL_PLAY_URL.replace("{bvid}", bvid).replace("{cid}", cid))
    const json = await res.json()
    const audioUrl = extractResponseJson(json, 'AudioUrl')
    console.log(audioUrl)
    // const audioUrl = 'https://upos-hz-mirrorakam.akamaized.net/upgcxcode/36/17/461821736/461821736_nb2-1-30280.m4s?e=ig8euxZM2rNcNbdlhoNvNC8BqJIzNbfqXBvEqxTEto8BTrNvN0GvT90W5JZMkX_YN0MvXg8gNEV4NC8xNEV4N03eN0B5tZlqNxTEto8BTrNvNeZVuJ10Kj_g2UB02J0mN0B5tZlqNCNEto8BTrNvNC7MTX502C8f2jmMQJ6mqF2fka1mqx6gqj0eN0B599M=&uipk=5&nbs=1&deadline=1639989193&gen=playurlv2&os=akam&oi=1754218863&trid=e8e5d222b7194d2f84c4841624f86c29u&platform=pc&upsig=8ce8f119ed478e1bc432f3ead9f9cab8&uparams=e,uipk,nbs,deadline,gen,os,oi,trid,platform&hdnts=exp=1639989193~hmac=652ed834ee6959194177c1887d2cf15399894172aa4781dfebdcc939aaf77f81&mid=1989881&bvc=vod&nettype=0&orderid=0,1&agrr=1&bw=40346&logo=80000000'
    // console.log('Data.js Calling fetchPlayUrl:')
    return (new Promise((resolve, reject) => {
        let a1 = audioUrl;
        let a2 = bvid;
        resolve(a1);
    }));
}