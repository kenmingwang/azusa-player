<p align="center"><a href="https://github.com/lyswhut/lx-music-desktop"><img width="200" src="https://github.com/kenmingwang/azusa-player/blob/master/public/img/icon-128.png?raw=true" alt="lx-music logo"></a></p>

<p align="center">
  <a href="https://github.com/kenmingwang/azusa-player/blob/master/LICENSE">
  <img src="https://camo.githubusercontent.com/992daabc2aa4463339825f8333233ba330dd08c57068f6faf4bb598ab5a3df2e/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f6c6963656e73652d4d49542d627269676874677265656e2e737667" alt="Software License" data-canonical-src="https://img.shields.io/badge/license-MIT-brightgreen.svg" style="max-width: 100%;">
  </a>
  <a href="https://github.com/kenmingwang/azusa-player/blob/master/LICENSE">
   <img src="https://img.shields.io/github/v/tag/kenmingwang/azusa-player">
   </a>
</p>
<h3 align="center" style="color:purple">Azusa-Player / 电梓播放器</h3>
<h4 align="center" style="color:purple"">A 3rd party Bilibili audio player / 一个Bilibili第三方音频播放器</h4>

## 项目简介

  - 是真正意义上的《电梓播放器》(?): Azusa-Player！
    - 私货默认歌单 [【阿梓】2021精选翻唱50首【纯享】](https://www.bilibili.com/video/BV1wr4y1v7TA)
  - 本质上是个b站第三方**音频在线播放器**，以浏览器扩展插件形式展现
  - 目的是想让视频**轻量化**为歌曲，方便溜歌/歌单分类/下载等
  - 支持单P/多P视频搜索(视情况适配新的合集功能)
    - <del> QA阶段才发现b站把分P砍了; ; </del>
  - 实现了歌名提取与歌词搜索
    - 歌名提取不准确的话需要手动输歌名
  - 切片man不易，没有各位切片man也不会有这个项目的意义，请大家溜歌同时多点进视频给他们个赞👍
  - 自用为主要目的，不感兴趣的feature大概不会做，有问题可以[b站私信](https://message.bilibili.com/#/whisper/mid1989881)
    - 但是欢迎提PR! <del>(虽然代码很烂)
  
### 截图：
   [![imgur](https://github.com/kenmingwang/azusa-player/blob/master/public/img/azusa-player2.gif?raw=true)]()

## 项目技术栈
 - [Chrome Extension](https://developer.chrome.com/docs/extensions/) + [React](https://github.com/facebook/react) + [MUI](https://mui.com/zh/)
 - [react-music-player](https://github.com/lijinke666/react-music-player)
 - [react-lrc](https://github.com/mebtte/react-lrc)
 - [react-chrome-extension-MV3](https://github.com/Sirage-t/react-chrome-extension-MV3)
 - 参考了[Listen1](https://github.com/listen1/listen1_chrome_extension)播放器的交互形式
  
## 项目协议

本项目基于 [MIT License](https://github.com/kenmingwang/azusa-player/blob/master/LICENSE) 许可证发行，以下协议是对于 MIT License 的补充，如有冲突，以以下协议为准。

词语约定：本协议中的“本项目”指Azusa-Player项目；“使用者”指签署本协议的使用者；“官方音乐平台”指对本项目内置的包括QQ音乐，哔哩哔哩动画等音源，歌词来源的官方平台统称；“版权数据”指包括但不限于图像、音频、名字等在内的他人拥有所属版权的数据。

1. 本项目的数据来源原理是从各官方音乐平台的公开服务器中拉取数据，经过对数据简单地筛选与合并后进行展示，因此本项目不对数据的准确性负责。
2. 使用本项目的过程中可能会产生版权数据，对于这些版权数据，本项目不拥有它们的所有权，为了避免造成侵权，使用者务必在**24小时**内清除使用本项目的过程中所产生的版权数据。
3. 本项目内的官方音乐平台别名为本项目内对官方音乐平台的一个称呼，不包含恶意，如果官方音乐平台觉得不妥，可联系本项目更改或移除。
4. 本项目内使用的部分包括但不限于字体、图片等资源来源于互联网，如果出现侵权可联系本项目移除。
5. 由于使用本项目产生的包括由于本协议或由于使用或无法使用本项目而引起的任何性质的任何直接、间接、特殊、偶然或结果性损害（包括但不限于因商誉损失、停工、计算机故障或故障引起的损害赔偿，或任何及所有其他商业损害或损失）由使用者负责。
6. 本项目完全免费，且开源发布于 GitHub 面向全世界人用作对技术的学习交流，本项目不对项目内的技术可能存在违反当地法律法规的行为作保证，**禁止在违反当地法律法规的情况下使用本项目**，对于使用者在明知或不知当地法律法规不允许的情况下使用本项目所造成的任何违法违规行为由使用者承担，本项目不承担由此造成的任何直接、间接、特殊、偶然或结果性责任。

若你使用了本项目，将代表你接受以上协议。

音乐视频平台不易，请尊重版权，支持正版。<br>
Contact: kenmingwang1234@gmail.com <br>
Bilibli: [_Nek](https://space.bilibili.com/1989881)
