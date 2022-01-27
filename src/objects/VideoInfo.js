export default class VideoInfo {
    constructor(title, desc, videoCount, picSrc, uploader, pages) {
        this.title = title
        this.desc = desc
        this.videoCount = videoCount
        this.picSrc = picSrc
        this.uploader = uploader
        this.pages = pages
    }

    isMutiPartVideo(){
        return this.videos > 1
    } 

    getMultiPartVideoList(){
        
    }
}