export type Song = {
  id: string;
  bvid: string;
  cid: string;
  name: string;
  singer: string;
  cover: string;
  musicSrc: string;
};

export type Playlist = {
  id: string;
  title: string;
  songs: Song[];
};

export type PlayerSettings = {
  volume: number;
  loopMode: "order" | "singleLoop" | "shuffle";
};
