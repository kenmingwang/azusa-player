
import fetch from "node-fetch";

const fetchFavList = async (mid) => {
    const res = await fetch(URL_FAV_LIST.replace('{mid}', mid))
    const json = await res.json()
    const data = json.data
    
    const v = new VideoInfo(
        data.title,
        data.desc,
        data.videos,
        data.pic,
        data.owner,
        data.pages.map((s) => { return ({ part: s.part, cid: s.cid }) }))
    return v
}

fetchFavList('1303535681')
