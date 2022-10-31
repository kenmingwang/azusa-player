export default class Song {
    constructor({ cid, bvid, name, singer, cover, musicSrc, singerId, lyric, lyricOffset, backupSrc }) {
        this.id = cid
        this.bvid = bvid
        this.name = name
        this.singer = singer
        this.singerId = singerId
        this.cover = cover
        this.musicSrc = musicSrc
        this.backupSrc = backupSrc
        this.lyric = lyric
        this.lyricOffset = lyricOffset
    }
}