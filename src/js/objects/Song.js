export default class Song {
    constructor({ cid, bvid, name, singer, cover, musicSrc, singerId, lyric, lyricOffset }) {
        this.id = cid
        this.bvid = bvid
        this.name = name
        this.singer = singer
        this.singerId = singerId
        this.cover = cover
        this.musicSrc = musicSrc
        this.lyric = lyric
        this.lyricOffset = lyricOffset
    }

    // getPersistData(){
    //     // lyric offset
    //     return({
    //         'id' : this.bvid,
    //         'name': this.name,
    //         'musicSrc': this.musicSrc
    //     })
    // }
}