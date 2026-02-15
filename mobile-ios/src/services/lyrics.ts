const URL_LRC_MAPPING = "https://raw.githubusercontent.com/kenmingwang/azusa-player-lrcs/main/mappings.txt";
const URL_LRC_BASE = "https://raw.githubusercontent.com/kenmingwang/azusa-player-lrcs/main/{songFile}";
const URL_QQ_SEARCH = "https://c.y.qq.com/splcloud/fcgi-bin/smartbox_new.fcg?key={KeyWord}";
const URL_QQ_LYRIC =
  "https://i.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?songmid={SongMid}&g_tk=5381&format=json&inCharset=utf8&outCharset=utf-8&nobase64=1";

export const extractSongName = (name: string) => {
  const match = /《.*》/.exec(name);
  if (match) return match[0].slice(1, -1);
  return name;
};

export const fetchLrcByName = async (name: string): Promise<string | null> => {
  const mapRes = await fetch(URL_LRC_MAPPING);
  const mappings = await mapRes.text();
  const files = mappings.split("\n");

  const songName = extractSongName(name);
  const songFile = files.find((line) => line.includes(songName));
  if (!songFile) return null;

  const lrcRes = await fetch(URL_LRC_BASE.replace("{songFile}", songFile));
  if (!lrcRes.ok) return null;

  const text = await lrcRes.text();
  return text.replaceAll("\r\n", "\n");
};

export const searchLyricCandidates = async (keyword: string): Promise<{ mid: string; label: string }[]> => {
  if (!keyword.trim()) return [];
  const res = await fetch(URL_QQ_SEARCH.replace("{KeyWord}", encodeURIComponent(keyword)));
  const json = await res.json();
  const items = json?.data?.song?.itemlist ?? [];
  return items.map((s: any, i: number) => ({
    mid: s.mid,
    label: `${i + 1}. ${s.name} / ${s.singer}`,
  }));
};

export const fetchLyricByMid = async (mid: string): Promise<string | null> => {
  const res = await fetch(URL_QQ_LYRIC.replace("{SongMid}", mid));
  const json = await res.json();
  if (!json?.lyric) return null;
  return json.trans ? `${json.trans}\n${json.lyric}` : json.lyric;
};
