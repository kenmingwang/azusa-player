export default class Song {
    constructor(bvid, name, singer, cover, musicSrc, lyric) {
        this.id = bvid
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