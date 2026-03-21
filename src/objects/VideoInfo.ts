export interface VideoPage {
  bvid: string;
  part: string;
  cid: string;
}

export interface VideoUploader {
  name: string;
  mid: string | number;
}

export default class VideoInfo {
  public title: string;
  public desc: string;
  public videoCount: number;
  public picSrc: string;
  public uploader: VideoUploader;
  public pages: VideoPage[];

  constructor(title: string, desc: string, videoCount: number, picSrc: string, uploader: VideoUploader, pages: VideoPage[]) {
    this.title = title;
    this.desc = desc;
    this.videoCount = videoCount;
    this.picSrc = picSrc;
    this.uploader = uploader;
    this.pages = pages;
  }

  isMultiPartVideo(): boolean {
    return this.videoCount > 1;
  }
}

