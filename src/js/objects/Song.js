export default class Song {
    constructor(cid, bvid, name, singer, cover, musicSrc, lyric) {
        this.id = cid
        this.bvid = bvid
        this.name = name
        this.singer = singer
        this.cover = cover
        this.musicSrc = musicSrc
        this.lyric = lyric
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