import { Logger } from './Logger';
import VideoInfo from '../objects/VideoInfo';
import { browserApi } from '../platform/browserApi';

const logger = new Logger('Data.js');

const URL_PLAY_URL = 'https://api.bilibili.com/x/player/playurl?cid={cid}&bvid={bvid}&qn=64&fnval=16';
const URL_BVID_TO_CID = 'https://api.bilibili.com/x/player/pagelist?bvid={bvid}&jsonp=jsonp';
const URL_VIDEO_INFO = 'https://api.bilibili.com/x/web-interface/view?bvid={bvid}';
const URL_BILISERIES_INFO =
  'https://api.bilibili.com/x/series/archives?mid={mid}&series_id={sid}&only_normal=true&sort=desc&pn={pn}&ps=30';
const URL_BILICOLLE_INFO =
  'https://api.bilibili.com/x/polymer/web-space/seasons_archives_list?mid={mid}&season_id={sid}&sort_reverse=false&page_num={pn}&page_size=30';
const URL_FAV_LIST =
  'https://api.bilibili.com/x/v3/fav/resource/list?media_id={mid}&pn={pn}&ps=20&keyword=&order=mtime&type=0&tid=0&platform=web&jsonp=jsonp';

const URL_LRC_MAPPING = 'https://raw.githubusercontent.com/kenmingwang/azusa-player-lrcs/main/mappings.txt';
const URL_LRC_BASE = 'https://raw.githubusercontent.com/kenmingwang/azusa-player-lrcs/main/{songFile}';
const URL_HEADER_GIFS = [
  'https://i0.hdslb.com/bfs/article/956a1680d1408517d60e901b63eded873fe1ed5f.gif',
  'https://i0.hdslb.com/bfs/article/b845058b7aaff1f51228c7369b473999ffcb7ee7.gif',
  'https://i0.hdslb.com/bfs/article/bc6b61c2fd818878c1d05da06cb13c5ad425a858.gif',
  'https://i0.hdslb.com/bfs/article/cd25f747b454b9006a25c81d5e7650f73c69ef17.gif',
  'https://i0.hdslb.com/bfs/article/b4afccb0ead8ee044d282cc586c35799a7c888ca.gif',
  'https://i0.hdslb.com/bfs/article/8df79587cda79b6a8e1624715ac5282585769001.gif',
  'https://i0.hdslb.com/bfs/article/a0553b08da8d80dc0f45833ae40146dd88d999a9.gif',
  'https://i0.hdslb.com/bfs/article/9d65d749cacccb307bfcc9a19c88224b0516f106.gif',
  'https://i0.hdslb.com/bfs/article/77c63ef57e4612b5a671d5a417b8513f7285c75e.gif',
  'https://i0.hdslb.com/bfs/article/768acaed9669b76ba1c105030e7a21c1ba15fa91.gif',
  'https://i0.hdslb.com/bfs/article/878b50e28dda6050e78f75d620f05f8a6de6a4c1.gif',
  'https://i0.hdslb.com/bfs/article/28837af291d81ed90500e1cb876769ab9932b91a.gif',
  'https://i0.hdslb.com/bfs/article/c88cc015b4b3e036e1b5689f262f6720b3e0ab97.gif',
];

const URL_QQ_SEARCH = 'https://c.y.qq.com/splcloud/fcgi-bin/smartbox_new.fcg?key={KeyWord}';
const URL_QQ_LYRIC =
  'https://i.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?songmid={SongMid}&g_tk=5381&format=json&inCharset=utf8&outCharset=utf-8&nobase64=1';
const URL_QQ_SEARCH_POST = {
  src: 'https://u.y.qq.com/cgi-bin/musicu.fcg',
  params: {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    referrer: 'https://u.qq.com/',
    body: {
      comm: {
        ct: '19',
        cv: '1859',
        uin: '0',
      },
      req: {
        method: 'DoSearchForQQMusicDesktop',
        module: 'music.search.SearchCgiService',
        param: {
          grp: 1,
          num_per_page: 20,
          page_num: 1,
          query: '',
          search_type: 0,
        },
      },
    },
  },
};

const WEB_API_PROXY = import.meta.env.VITE_WEB_API_PROXY || '';

const buildRequestUrl = (url) => {
  if (!WEB_API_PROXY) return url;

  try {
    const proxyUrl = new URL(WEB_API_PROXY, window.location.origin);
    proxyUrl.searchParams.set('url', url);
    return proxyUrl.toString();
  } catch {
    return url;
  }
};

const normalizeLineBreak = (text = '') => String(text).replace(/\r\n/g, '\n');

const tryFixMojibake = (text = '') => {
  const source = String(text);
  if (!/[??D???é]/.test(source)) return source;
  try {
    return decodeURIComponent(escape(source));
  } catch {
    return source;
  }
};

const normalizeLyricText = (text = '') => normalizeLineBreak(tryFixMojibake(text));

const extractResponseJson = (json, field) => {
  if (field === 'AudioUrl') {
    const audios = json?.data?.dash?.audio || [];
    if (audios.length === 0) return '';

    const ordered = [...audios].sort((a, b) => {
      const aScore = Number(a?.bandwidth || a?.id || 0);
      const bScore = Number(b?.bandwidth || b?.id || 0);
      return bScore - aScore;
    });

    const preferred = ordered.find((a) => String(a?.codecs || '').includes('mp4a')) || ordered[0];
    return preferred?.baseUrl || preferred?.base_url || preferred?.backupUrl?.[0] || preferred?.backup_url?.[0] || '';
  }

  if (field === 'CID') {
    return json?.data?.[0]?.cid;
  }

  return {};
};

export const fetchPlayUrlPromise = async (bvid, cid) => {
  if (!cid) {
    cid = await fetchCID(bvid).catch((err) => {
      console.log(err);
      return undefined;
    });
  }

  return new Promise((resolve, reject) => {
    browserApi.storage.local.get(['CurrentPlaying', 'PlayerSetting'], function (result) {
      const currentPlaying = result?.CurrentPlaying;
      const playMode = result?.PlayerSetting?.playMode;
      if (currentPlaying && currentPlaying.cid == cid && playMode !== 'singleLoop' && currentPlaying.playUrl) {
        resolve(currentPlaying.playUrl);
        return;
      }

      fetch(buildRequestUrl(URL_PLAY_URL.replace('{bvid}', bvid).replace('{cid}', cid)))
        .then((res) => res.json())
        .then((json) => resolve(extractResponseJson(json, 'AudioUrl')))
        .catch((err) => {
          console.log(err);
          reject(err);
        });
    });
  });
};

export const fetchCID = async (bvid) => {
  const res = await fetch(buildRequestUrl(URL_BVID_TO_CID.replace('{bvid}', bvid)));
  const json = await res.json();
  return extractResponseJson(json, 'CID');
};

export const fetchLRC = async (name, setLyric, setSongTitle) => {
  const res = await fetch(buildRequestUrl(URL_LRC_MAPPING));
  const mappings = await res.text();
  const songs = mappings.split('\n');
  const songName = extractSongName(name);
  setSongTitle(songName);

  const songFile = songs.find((v) => v.includes(songName));
  if (!songFile) {
    setLyric('[00:00.000] 无法找到歌词');
    return;
  }

  try {
    const lrcRes = await fetch(buildRequestUrl(URL_LRC_BASE.replace('{songFile}', songFile)));
    if (!lrcRes.ok) {
      setLyric('[00:00.000] 无法找到歌词');
      return;
    }

    const text = normalizeLyricText(await lrcRes.text());
    setLyric(text);
    return text;
  } catch {
    setLyric('[00:00.000] 无法找到歌词');
  }
};

export const fetchVideoInfo = async (bvid) => {
  logger.info('calling fetchVideoInfo');
  const res = await fetch(buildRequestUrl(URL_VIDEO_INFO.replace('{bvid}', bvid)));
  const json = await res.json();

  try {
    const data = json.data;
    return new VideoInfo(
      data.title,
      data.desc,
      data.videos,
      data.pic,
      data.owner,
      data.pages.map((s) => ({ bvid, part: s.part, cid: s.cid })),
    );
  } catch {
    console.log('Some issue happened when fetching', bvid);
    return undefined;
  }
};

export const fetchBiliSeriesInfo = async (mid, sid) => {
  logger.info('calling fetchBiliSeriesInfo');
  const page = 0;
  const res = await fetch(buildRequestUrl(URL_BILISERIES_INFO.replace('{mid}', mid).replace('{sid}', sid).replace('{pn}', page)));
  const json = await res.json();
  const data = json.data;

  const bvidPromises = (data.archives || []).map((v) => fetchVideoInfo(v.bvid));
  return Promise.all(bvidPromises);
};

export const fetchBiliColleList = async (mid, sid, favList = []) => {
  logger.info('calling fetchBiliColleList');
  const res = await fetch(buildRequestUrl(URL_BILICOLLE_INFO.replace('{mid}', mid).replace('{sid}', sid).replace('{pn}', 1)));
  const json = await res.clone().json();
  const data = json.data;

  const mediaCount = data.meta.total;
  const totalPagesRequired = 1 + Math.floor(mediaCount / data.page.page_size);

  const bvidPromises = [];
  const pagesPromises = [res];

  for (let page = 2; page <= totalPagesRequired; page++) {
    pagesPromises.push(fetch(buildRequestUrl(URL_BILICOLLE_INFO.replace('{mid}', mid).replace('{sid}', sid).replace('{pn}', page))));
  }

  const pages = await Promise.all(pagesPromises);
  for (const response of pages) {
    const pageJson = await response.json();
    const archives = pageJson?.data?.archives || [];
    archives.forEach((m) => {
      if (!favList.includes(m.bvid)) {
        bvidPromises.push(fetchVideoInfo(m.bvid));
      }
    });
  }

  return Promise.all(bvidPromises);
};

export const fetchFavList = async (mid) => {
  logger.info('calling fetchFavList');
  const res = await fetch(buildRequestUrl(URL_FAV_LIST.replace('{mid}', mid).replace('{pn}', 1)));
  const json = await res.json();
  const data = json.data;

  const mediaCount = data.info.media_count;
  const totalPagesRequired = Math.ceil(mediaCount / 20);

  const bvidPromises = (data.medias || []).map((m) => fetchVideoInfo(m.bvid));
  const pagesPromises = [];

  for (let page = 2; page <= totalPagesRequired; page++) {
    pagesPromises.push(fetch(buildRequestUrl(URL_FAV_LIST.replace('{mid}', mid).replace('{pn}', page))));
  }

  const pages = await Promise.all(pagesPromises);
  for (const response of pages) {
    const pageJson = await response.json();
    const medias = pageJson?.data?.medias || [];
    medias.forEach((m) => bvidPromises.push(fetchVideoInfo(m.bvid)));
  }

  return Promise.all(bvidPromises);
};

export const extractSongName = (name) => {
  const source = String(name || '');
  const match = source.match(/《([^》]+)》/);
  if (match?.[1]) return match[1];
  return source;
};

export const getRandomHeaderGIF = () => {
  const randomIndex = Math.floor(Math.random() * URL_HEADER_GIFS.length);
  return URL_HEADER_GIFS[randomIndex];
};

export const searchLyricOptions = async (searchKey, setOptions) => {
  logger.info('calling searchLyricOptions');
  if (searchKey == '') {
    setOptions([]);
    return;
  }

  const res = await fetch(buildRequestUrl(URL_QQ_SEARCH.replace('{KeyWord}', searchKey)));
  const json = await res.json();
  const data = json?.data?.song?.itemlist || [];
  const slimData = data.map((s, i) => ({
    key: s.mid,
    songMid: s.mid,
    label: `${i}. ${s.name} / ${s.singer}`,
  }));

  if (slimData.length) {
    setOptions(slimData);
  } else {
    searchLyricOptionsFallBack(searchKey, setOptions);
  }
};

export const searchLyricOptionsFallBack = async (searchKey, setOptions) => {
  logger.info('calling searchLyricOptionsFallBack');
  if (searchKey == '') {
    setOptions([]);
    return;
  }

  const api = getQQSearchAPI(searchKey);
  const res = await fetch(buildRequestUrl(api.src), api.params);
  const json = await res.json();
  const data = json?.req?.data?.body?.song?.list || [];

  setOptions(
    data.map((s, i) => ({
      key: s.mid,
      songMid: s.mid,
      label: `${i}. ${s.name} / ${s.singer?.[0]?.name || ''}`,
    })),
  );
};

const getQQSearchAPI = (searchKey) => {
  const api = JSON.parse(JSON.stringify(URL_QQ_SEARCH_POST));
  api.params.body.req.param.query = searchKey;
  api.params.body = JSON.stringify(api.params.body);
  return api;
};

export const searchLyric = async (searchMID, setLyric) => {
  logger.info('calling searchLyric');
  const res = await fetch(buildRequestUrl(URL_QQ_LYRIC.replace('{SongMid}', searchMID)));
  const json = await res.json();

  if (!json.lyric) {
    setLyric('[00:00.000] 无法找到歌词, 请手动搜索');
    return;
  }

  let finalLrc = normalizeLyricText(json.lyric);
  if (json.trans) {
    finalLrc = `${normalizeLyricText(json.trans)}\n${finalLrc}`;
  }

  setLyric(finalLrc);
};

