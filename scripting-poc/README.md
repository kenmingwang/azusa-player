# Azusa Scripting PoC

这个目录是给 [Scripting](https://scriptingapp.github.io/) 准备的最小可行播放器 PoC，不碰你现有的原生 iOS 工程。

## 目标

- 用 `Scripting` 直接请求 Bilibili API，而不是走 Safari/PWA 的 CORS 限制
- 跑通 `BV 导入 -> 分P列表 -> 点击播放 -> 锁屏控制 -> 后台下载`
- 先验证“能不能做”，再决定要不要继续做歌词、歌单、收藏夹、离线索引

## 当前包含的能力

- `index.tsx`
  - 主入口，直接在 Scripting 里打开 UI
- `intent.tsx`
  - 作为 Share Sheet / Shortcuts 入口，可接收 bilibili 链接或文本
- `lib/api.ts`
  - Bilibili 视频信息和播放地址请求
- `lib/player.ts`
  - `AVPlayer` 播放、`MediaPlayer` 锁屏信息与耳机控制
- `lib/storage.ts`
  - 轻量状态记忆与下载索引
- `lib/app.tsx`
  - PoC 页面

## 在 Scripting 里怎么试

1. 新建一个 Script Project。
2. 把这个目录里的文件按同样结构放进去。
3. 运行 `index.tsx`。
4. 在输入框填一个 `BV` 号或 bilibili 视频链接。
5. 导入后点击任意分P开始播放。
6. 如果想走 Share Sheet：
   - 把 `intent.tsx` 加进项目
   - 在项目标题栏里打开 Intent Settings
   - 勾选 `Text` 和 `URLs`

## 现在的边界

- 这是 PoC，不是完整移植版
- 先只支持 `BV / 视频链接`
- 还没接：
  - 收藏夹导入
  - QQ 歌词搜索
  - 更完整的下载管理
  - 真正的离线曲库索引
  - Azusa 原版的大型歌单 UI

## 下一步建议

如果这版在你手机上的 `Scripting` 里能稳定播，我们下一步最值得做的是：

1. 加 `收藏夹 / 合集 / 频道` 导入
2. 把歌词映射和 QQ 搜词接回来
3. 用 `SQLite + FileManager` 做离线索引
4. 把当前播放器 UI 压成更像 Azusa 的移动端界面
