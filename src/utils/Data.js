import { Logger } from './Logger';
import VideoInfo from '../objects/VideoInfo';
import { browserApi } from '../platform/browserApi';

const logger = new Logger('Data.js');

// fnval=4048 requests every DASH feature (16 DASH | 64 HDR | 128 4K | 256 Dolby audio | 512 Dolby vision | 1024 8K | 2048 AV1)
// so that hi-res / dolby audio streams show up for accounts that own them.
const URL_PLAY_URL = 'https://api.bilibili.com/x/player/playurl?cid={cid}&bvid={bvid}&qn=127&fnval=4048&fourk=1';
// Legacy request kept as a safety net: some risk-control cohorts reject the extended fnval mask.
const URL_PLAY_URL_FALLBACK = 'https://api.bilibili.com/x/player/playurl?cid={cid}&bvid={bvid}&qn=64&fnval=16';
const URL_BVID_TO_CID = 'https://api.bilibili.com/x/player/pagelist?bvid={bvid}&jsonp=jsonp';
const URL_VIDEO_INFO = 'https://api.bilibili.com/x/web-interface/view?bvid={bvid}';
const URL_BILISERIES_INFO =
  'https://api.bilibili.com/x/series/archives?mid={mid}&series_id={sid}&only_normal=true&sort=desc&pn={pn}&ps=30';
const URL_BILICOLLE_INFO =
  'https://api.bilibili.com/x/polymer/web-space/seasons_archives_list?mid={mid}&season_id={sid}&sort_reverse=false&page_num={pn}&page_size=30';
const URL_FAV_LIST =
  'https://api.bilibili.com/x/v3/fav/resource/list?media_id={mid}&pn={pn}&ps=20&keyword=&order=mtime&type=0&tid=0&platform=web&jsonp=jsonp';

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

export const tryFixMojibake = (text = '') => {
  const source = String(text);
  if (!/[??D???é]/.test(source)) return source;
  try {
    return decodeURIComponent(escape(source));
  } catch {
    return source;
  }
};

const normalizeLyricText = (text = '') => normalizeLineBreak(tryFixMojibake(text));

const fetchJsonWithPolicy = async (url, init = {}, includeCredentials = false) => {
  const response = await fetch(buildRequestUrl(url), {
    ...init,
    ...(includeCredentials ? { credentials: 'include' } : {}),
    headers: {
      Accept: 'application/json, text/plain, */*',
      ...(init.headers || {}),
    },
  });

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const preview = (await response.text()).slice(0, 160);
    throw new Error(`Bilibili API did not return JSON. content-type=${contentType || 'unknown'}, preview=${preview}`);
  }

  return response.json();
};

const fetchBiliJson = async (url, init = {}) => fetchJsonWithPolicy(url, init, false);
const fetchBiliJsonWithCredentials = async (url, init = {}) => fetchJsonWithPolicy(url, init, true);

const ensureBiliSuccess = (json) => {
  if (typeof json?.code === 'number' && json.code !== 0) {
    throw new Error(json.message || json.msg || `Bilibili API error ${json.code}`);
  }
  return json;
};

const getStreamUrl = (stream) =>
  stream?.baseUrl || stream?.base_url || stream?.backupUrl?.[0] || stream?.backup_url?.[0] || '';

// Human readable labels for bilibili dash audio quality ids.
export const AUDIO_QUALITY_LABELS = {
  30216: '64K',
  30232: '132K',
  30280: '192K',
  30250: '杜比',
  30251: '无损',
  30252: '无损',
};

export const AUDIO_QUALITY_TITLES = {
  30216: '64K AAC',
  30232: '132K AAC',
  30280: '192K AAC',
  30250: '杜比全景声',
  30251: 'Hi-Res 无损',
  30252: 'Hi-Res 无损',
};

// Higher rank wins. Hi-Res (FLAC) > Dolby > 192K > 132K > 64K.
const AUDIO_QUALITY_RANKS = {
  30252: 6,
  30251: 5,
  30250: 4,
  30280: 3,
  30232: 2,
  30216: 1,
};

const describeBandwidth = (bandwidth) => {
  const value = Number(bandwidth || 0);
  if (!value) return '未知音质';
  if (value >= 1000) return `${Math.round(value / 1000)}K`;
  return `${Math.round(value)}bps`;
};

export const describeAudioQuality = (stream) => {
  const qualityId = Number(stream?.id ?? stream?.quality ?? 0);
  const label = AUDIO_QUALITY_LABELS[qualityId] || describeBandwidth(stream?.bandwidth);
  const title = AUDIO_QUALITY_TITLES[qualityId] || label;
  return { qualityId, label, title };
};

export const getAudioFileExtension = (stream) => {
  const mime = String(stream?.mimeType || stream?.mime_type || '').toLowerCase();
  const codecs = String(stream?.codecs || '').toLowerCase();
  if (mime.includes('flac') || codecs.includes('flac')) return 'flac';
  if (mime.includes('eac3') || mime.includes('ec-3') || codecs.includes('ec-3')) return 'eac3';
  if (mime.includes('mpeg') && !mime.includes('mp4')) return 'mp3';
  if (mime.includes('mp4') || codecs.includes('mp4a') || codecs.includes('aac')) return 'm4a';
  return 'm4a';
};

// dash.audio holds the AAC ladder, dash.flac / dash.dolby hold the premium audio streams.
export const collectAudioStreams = (json) => {
  const dash = json?.data?.dash;
  if (!dash) return [];

  const candidates = [];
  if (Array.isArray(dash.audio)) candidates.push(...dash.audio);
  if (Array.isArray(dash.dolby?.audio)) candidates.push(...dash.dolby.audio);
  if (Array.isArray(dash.flac?.audio)) candidates.push(...dash.flac.audio);
  else if (dash.flac?.audio) candidates.push(dash.flac.audio);

  const seen = new Set();
  return candidates.filter((stream) => {
    if (!stream) return false;
    const url = getStreamUrl(stream);
    if (!url) return false;
    const key = `${stream.id}-${url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const streamScore = (stream) => {
  const rank = AUDIO_QUALITY_RANKS[Number(stream?.id ?? stream?.quality ?? 0)] || 0;
  return rank * 1e9 + Number(stream?.bandwidth || 0);
};

const streamCodecPreference = (stream) => {
  const codecs = String(stream?.codecs || '').toLowerCase();
  const mime = String(stream?.mimeType || stream?.mime_type || '').toLowerCase();
  return codecs.includes('mp4a') || codecs.includes('flac') || mime.includes('mp4') || mime.includes('flac') ? 1 : 0;
};

export const pickBestAudioStream = (streams = [], preferredQualityId) => {
  const playable = (streams || []).filter((stream) => stream && getStreamUrl(stream));
  if (!playable.length) return undefined;

  if (preferredQualityId) {
    const preferred = playable.filter((stream) => Number(stream?.id) === Number(preferredQualityId));
    if (preferred.length) {
      return [...preferred].sort((a, b) => Number(b?.bandwidth || 0) - Number(a?.bandwidth || 0))[0];
    }
  }

  return [...playable].sort((a, b) => {
    const scoreDiff = streamScore(b) - streamScore(a);
    if (scoreDiff) return scoreDiff;
    const codecDiff = streamCodecPreference(b) - streamCodecPreference(a);
    if (codecDiff) return codecDiff;
    return Number(b?.bandwidth || 0) - Number(a?.bandwidth || 0);
  })[0];
};

// Turns a raw dash audio stream into the shape the UI / downloader works with.
export const describeAudioStream = (stream) => {
  if (!stream) return undefined;
  const { qualityId, label, title } = describeAudioQuality(stream);
  return {
    qualityId,
    label,
    title,
    codecs: String(stream.codecs || ''),
    bandwidth: Number(stream.bandwidth || 0),
    mimeType: String(stream.mimeType || stream.mime_type || ''),
    extension: getAudioFileExtension(stream),
    url: getStreamUrl(stream),
    fetchedAt: Date.now(),
  };
};

// Remembers which variant of the playurl request worked so later calls skip failing attempts.
let workingPlayUrlVariant = null;

const requestAudioStreams = async (variant, bvid, cid) => {
  const url = variant.template.replace('{bvid}', bvid).replace('{cid}', cid);
  const json = variant.withCredentials ? await fetchBiliJsonWithCredentials(url) : await fetchBiliJson(url);
  return collectAudioStreams(json);
};

export const fetchAudioStreams = async (bvid, cid) => {
  const variants = [
    ...(workingPlayUrlVariant ? [workingPlayUrlVariant] : []),
    { template: URL_PLAY_URL, withCredentials: true },
    { template: URL_PLAY_URL, withCredentials: false },
    { template: URL_PLAY_URL_FALLBACK, withCredentials: false },
  ];

  let lastError;
  for (const variant of variants) {
    try {
      const streams = await requestAudioStreams(variant, bvid, cid);
      if (streams.length) {
        workingPlayUrlVariant = variant;
        return streams;
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) throw lastError;
  return [];
};

// Returns the highest available audio stream (url + quality metadata) for a page.
export const fetchBestAudio = async (bvid, cid, preferredQualityId) => {
  const streams = await fetchAudioStreams(bvid, cid);
  return describeAudioStream(pickBestAudioStream(streams, preferredQualityId));
};

const extractResponseJson = (json, field) => {
  if (field === 'AudioUrl') {
    const best = pickBestAudioStream(collectAudioStreams(json));
    return getStreamUrl(best);
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

      fetchBestAudio(bvid, cid)
        .then((audio) => resolve(audio?.url || ''))
        .catch((err) => {
          console.log(err);
          reject(err);
        });
    });
  });
};

export const fetchCID = async (bvid) => {
  try {
    const json = ensureBiliSuccess(await fetchBiliJson(URL_BVID_TO_CID.replace('{bvid}', bvid)));
    return extractResponseJson(json, 'CID');
  } catch (error) {
    console.log(error);
    return undefined;
  }
};

export const fetchVideoInfo = async (bvid) => {
  logger.info('calling fetchVideoInfo');
  try {
    const json = ensureBiliSuccess(await fetchBiliJson(URL_VIDEO_INFO.replace('{bvid}', bvid)));
    const data = json.data;
    return new VideoInfo(
      data.title,
      data.desc,
      data.videos,
      data.pic,
      data.owner,
      data.pages.map((s) => ({ bvid, part: s.part, cid: s.cid })),
    );
  } catch (error) {
    console.log('Some issue happened when fetching', bvid, error);
    return undefined;
  }
};

export const fetchBiliSeriesInfo = async (mid, sid) => {
  logger.info('calling fetchBiliSeriesInfo');
  const bvids = await fetchBiliSeriesBvids(mid, sid);
  return Promise.all(bvids.map((bvid) => fetchVideoInfo(bvid)));
};

export const fetchBiliColleList = async (mid, sid, favList = []) => {
  logger.info('calling fetchBiliColleList');
  const bvids = await fetchBiliColleBvids(mid, sid, favList);
  return Promise.all(bvids.map((bvid) => fetchVideoInfo(bvid)));
};

export const fetchBiliSeriesBvids = async (mid, sid) => {
  logger.info('calling fetchBiliSeriesBvids');
  const page = 0;
  const json = ensureBiliSuccess(await fetchBiliJson(URL_BILISERIES_INFO.replace('{mid}', mid).replace('{sid}', sid).replace('{pn}', page)));
  return (json?.data?.archives || []).map((v) => String(v?.bvid || '')).filter(Boolean);
};

export const fetchBiliColleBvids = async (mid, sid, favList = []) => {
  logger.info('calling fetchBiliColleBvids');
  const firstPageUrl = URL_BILICOLLE_INFO.replace('{mid}', mid).replace('{sid}', sid).replace('{pn}', 1);
  const json = ensureBiliSuccess(await fetchBiliJson(firstPageUrl));
  const data = json.data;

  const mediaCount = data.meta.total;
  const totalPagesRequired = 1 + Math.floor(mediaCount / data.page.page_size);

  const pagesPromises = [Promise.resolve(json)];
  const favSet = new Set((favList || []).map((item) => String(item || '')));

  for (let page = 2; page <= totalPagesRequired; page++) {
    pagesPromises.push(fetchBiliJson(URL_BILICOLLE_INFO.replace('{mid}', mid).replace('{sid}', sid).replace('{pn}', page)));
  }

  const pages = (await Promise.all(pagesPromises)).map(ensureBiliSuccess);
  return pages.flatMap((pageJson) =>
    (pageJson?.data?.archives || [])
      .map((m) => String(m?.bvid || ''))
      .filter((bvid) => bvid && !favSet.has(bvid)),
  );
};

const fetchFavPage = async (mid, page) => {
  const url = URL_FAV_LIST.replace('{mid}', mid).replace('{pn}', page);
  try {
    return await fetchBiliJson(url);
  } catch (error) {
    console.log('fetchFavList public request failed, retry with credentials', mid, page, error);
    return fetchBiliJsonWithCredentials(url);
  }
};

export const fetchFavBvids = async (mid) => {
  logger.info('calling fetchFavBvids');
  const json = ensureBiliSuccess(await fetchFavPage(mid, 1));
  const data = json.data;

  const mediaCount = data.info.media_count;
  const totalPagesRequired = Math.ceil(mediaCount / 20);
  const pagesPromises = [];

  for (let page = 2; page <= totalPagesRequired; page++) {
    pagesPromises.push(fetchFavPage(mid, page));
  }

  const pages = (await Promise.all(pagesPromises)).map(ensureBiliSuccess);
  return [
    ...(data.medias || []).map((m) => String(m?.bvid || '')).filter(Boolean),
    ...pages.flatMap((pageJson) => (pageJson?.data?.medias || []).map((m) => String(m?.bvid || '')).filter(Boolean)),
  ];
};

export const fetchFavList = async (mid) => {
  logger.info('calling fetchFavList');
  const bvids = await fetchFavBvids(mid);
  return Promise.all(bvids.map((bvid) => fetchVideoInfo(bvid)));
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
