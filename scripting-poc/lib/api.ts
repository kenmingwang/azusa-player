import { attachDownloadedPaths } from "./storage";
import type { ImportResult, Track } from "./types";

const BILI_HEADERS = {
  Referer: "https://www.bilibili.com/",
  Origin: "https://www.bilibili.com",
  "User-Agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  Accept: "application/json,text/plain,*/*",
};

const VIDEO_INFO_URL =
  "https://api.bilibili.com/x/web-interface/view?bvid={bvid}";
const PLAY_URL =
  "https://api.bilibili.com/x/player/playurl?cid={cid}&bvid={bvid}&qn=64&fnval=16";

type VideoInfoResponse = {
  code: number;
  message?: string;
  data?: {
    bvid: string;
    title: string;
    pic?: string;
    owner: {
      name: string;
    };
    pages: Array<{
      cid: number;
      part: string;
    }>;
  };
};

type PlayUrlResponse = {
  code: number;
  message?: string;
  data?: {
    timelength?: number;
    dash?: {
      audio?: Array<{
        id?: number;
        bandwidth?: number;
        baseUrl?: string;
        backupUrl?: string[];
        mimeType?: string;
        codecs?: string;
      }>;
    };
    durl?: Array<{
      url: string;
    }>;
  };
};

function normalizeHttps(url?: string) {
  if (!url) return "";
  return url.replace(/^http:\/\//i, "https://");
}

export function parseBvid(input: string) {
  const match = input.match(/BV[0-9A-Za-z]{10}/i);
  return match?.[0]?.toUpperCase() ?? null;
}

async function fetchJson<T>(url: string, debugLabel: string): Promise<T> {
  const response = await fetch(url, {
    headers: BILI_HEADERS,
    timeout: 15,
    debugLabel,
  } as any);

  if (!response.ok) {
    throw new Error(`${debugLabel} failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

function scoreAudio(audio: NonNullable<PlayUrlResponse["data"]>["dash"]["audio"][number]) {
  const codec = (audio.codecs ?? "").toLowerCase();
  const mimeType = (audio.mimeType ?? "").toLowerCase();
  const bandwidth = audio.bandwidth ?? 999999;
  const distanceFromSweetSpot = Math.abs(bandwidth - 132000);

  let score = 0;
  if (codec.includes("mp4a")) score += 120;
  if (mimeType.includes("audio/mp4")) score += 40;
  score -= Math.floor(distanceFromSweetSpot / 2000);
  return score;
}

function selectPreferredAudio(
  audios: NonNullable<PlayUrlResponse["data"]>["dash"]["audio"] = [],
) {
  if (!audios.length) return null;
  return [...audios].sort((left, right) => scoreAudio(right) - scoreAudio(left))[0];
}

export async function importFromInput(input: string): Promise<ImportResult> {
  const bvid = parseBvid(input);
  if (!bvid) {
    throw new Error("请输入 BV 号或 Bilibili 视频链接");
  }

  const response = await fetchJson<VideoInfoResponse>(
    VIDEO_INFO_URL.replace("{bvid}", bvid),
    `VideoInfo ${bvid}`,
  );

  if (response.code !== 0 || !response.data) {
    throw new Error(response.message || "Bilibili 视频信息获取失败");
  }

  const sourceTitle = response.data.title;
  const ownerName = response.data.owner.name;
  const tracks = attachDownloadedPaths(
    response.data.pages.map((page) => ({
      id: `${response.data!.bvid}:${page.cid}`,
      bvid: response.data!.bvid,
      cid: String(page.cid),
      title: page.part || sourceTitle,
      artist: ownerName,
      sourceTitle,
      cover: normalizeHttps(response.data!.pic),
    })),
  );

  return {
    sourceTitle,
    ownerName,
    cover: normalizeHttps(response.data.pic),
    tracks,
  };
}

export async function resolveTrackStream(track: Track): Promise<Track> {
  if (track.streamUrl || track.localFilePath) {
    return track;
  }

  const response = await fetchJson<PlayUrlResponse>(
    PLAY_URL.replace("{cid}", track.cid).replace("{bvid}", track.bvid),
    `PlayUrl ${track.bvid}/${track.cid}`,
  );

  if (response.code !== 0 || !response.data) {
    throw new Error(response.message || "播放地址获取失败");
  }

  const selectedAudio = selectPreferredAudio(response.data.dash?.audio);
  const streamUrl = normalizeHttps(
    selectedAudio?.baseUrl || response.data.durl?.[0]?.url,
  );
  const backupStreamUrls = (selectedAudio?.backupUrl ?? []).map(normalizeHttps);

  if (!streamUrl) {
    throw new Error("没有可用的音频流");
  }

  return {
    ...track,
    streamUrl,
    backupStreamUrls,
    durationSeconds: response.data.timelength
      ? Math.floor(response.data.timelength / 1000)
      : undefined,
  };
}

export function requestHeaders() {
  return { ...BILI_HEADERS };
}
