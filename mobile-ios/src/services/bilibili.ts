import { Song } from "../types";
import { parseBvid } from "../utils/parse";

const URL_PLAY_URL = "https://api.bilibili.com/x/player/playurl?cid={cid}&bvid={bvid}&qn=64&fnval=16";
const URL_BVID_TO_CID = "https://api.bilibili.com/x/player/pagelist?bvid={bvid}&jsonp=jsonp";
const URL_VIDEO_INFO = "https://api.bilibili.com/x/web-interface/view?bvid={bvid}";
const URL_FAV_LIST =
  "https://api.bilibili.com/x/v3/fav/resource/list?media_id={mid}&pn={pn}&ps=20&keyword=&order=mtime&type=0&tid=0&platform=web&jsonp=jsonp";

type VideoInfoResponse = {
  data: {
    bvid: string;
    title: string;
    pic: string;
    owner: { name: string };
    pages: { cid: number; part: string }[];
  };
};

const toSong = (v: VideoInfoResponse["data"], cid: number, part: string): Song => ({
  id: String(cid),
  bvid: v.bvid,
  cid: String(cid),
  name: part?.trim() || v.title,
  singer: v.owner?.name || "Bilibili",
  cover: v.pic,
  musicSrc: "",
});

export const fetchPlayUrl = async (bvid: string, cid: string): Promise<string> => {
  const res = await fetch(URL_PLAY_URL.replace("{bvid}", bvid).replace("{cid}", cid));
  const json = await res.json();
  return json?.data?.dash?.audio?.[0]?.baseUrl ?? "";
};

export const fetchCID = async (bvid: string): Promise<string> => {
  const res = await fetch(URL_BVID_TO_CID.replace("{bvid}", bvid));
  const json = await res.json();
  return String(json?.data?.[0]?.cid ?? "");
};

export const fetchVideoInfo = async (bvid: string): Promise<VideoInfoResponse["data"]> => {
  const res = await fetch(URL_VIDEO_INFO.replace("{bvid}", bvid));
  const json = (await res.json()) as VideoInfoResponse;
  return json.data;
};

export const fetchSongsByBvid = async (bvidOrUrl: string): Promise<Song[]> => {
  const bvid = parseBvid(bvidOrUrl);
  if (!bvid) throw new Error("Invalid BVID or video URL");

  const data = await fetchVideoInfo(bvid);
  const songs = data.pages.map((page) => toSong(data, page.cid, page.part));

  const firstPlayable = await fetchPlayUrl(songs[0].bvid, songs[0].cid);
  if (!firstPlayable) throw new Error("Failed to fetch playable audio URL");

  return songs;
};

export const fetchFavSongs = async (mediaId: string): Promise<Song[]> => {
  const firstRes = await fetch(URL_FAV_LIST.replace("{mid}", mediaId).replace("{pn}", "1"));
  const firstJson = await firstRes.json();

  const mediaCount = firstJson?.data?.info?.media_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(mediaCount / 20));

  const bvIds: string[] = [];
  for (const media of firstJson?.data?.medias ?? []) {
    if (media?.bvid) bvIds.push(media.bvid);
  }

  for (let page = 2; page <= totalPages; page++) {
    const pageRes = await fetch(URL_FAV_LIST.replace("{mid}", mediaId).replace("{pn}", String(page)));
    const pageJson = await pageRes.json();
    for (const media of pageJson?.data?.medias ?? []) {
      if (media?.bvid) bvIds.push(media.bvid);
    }
  }

  const allSongs: Song[] = [];
  for (const bvid of bvIds) {
    const info = await fetchVideoInfo(bvid);
    info.pages.forEach((page) => allSongs.push(toSong(info, page.cid, page.part)));
  }

  return allSongs;
};
