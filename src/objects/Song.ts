export interface SongProps {
    cid: string;
    bvid: string;
    name: string;
    singer: string;
    cover: string;
    musicSrc: string | (() => Promise<string>);
    singerId: string | number;
    lyric?: string;
    lyricOffset?: number;
}

export default class Song {
    public id: string;
    public bvid: string;
    public name: string;
    public singer: string;
    public singerId: string | number;
    public cover: string;
    public musicSrc: string | (() => Promise<string>);
    public lyric?: string;
    public lyricOffset?: number;

    constructor({ cid, bvid, name, singer, cover, musicSrc, singerId, lyric, lyricOffset }: SongProps) {
        this.id = cid;
        this.bvid = bvid;
        this.name = name;
        this.singer = singer;
        this.singerId = singerId;
        this.cover = cover;
        this.musicSrc = musicSrc;
        this.lyric = lyric;
        this.lyricOffset = lyricOffset;
    }
}
