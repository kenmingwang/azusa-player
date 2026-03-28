import {
  BackgroundURLSession,
  Button,
  FileManager,
  Form,
  HStack,
  NavigationStack,
  Path,
  Script,
  Section,
  Spacer,
  Text,
  TextField,
  useEffect,
  useMemo,
  useState,
  VStack,
} from "scripting";

import { importFromInput, requestHeaders } from "./api";
import { getSharedPlayer } from "./player";
import { attachDownloadedPaths, loadState, rememberDownload, saveState } from "./storage";
import type { PlaybackUiState, Track } from "./types";

type AzusaPoCAppProps = {
  initialInput?: string;
  autoImport?: boolean;
};

function formatDuration(seconds?: number) {
  if (!seconds || Number.isNaN(seconds)) return "--:--";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function sanitizeFileName(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, " ").trim();
}

export function AzusaPoCApp({
  initialInput,
  autoImport = false,
}: AzusaPoCAppProps) {
  const persisted = useMemo(() => loadState(), []);
  const player = useMemo(() => getSharedPlayer(), []);

  const [input, setInput] = useState(initialInput ?? persisted.lastInput ?? "");
  const [sourceTitle, setSourceTitle] = useState(persisted.sourceTitle ?? "");
  const [queue, setQueue] = useState(attachDownloadedPaths(persisted.queue ?? []) as Track[]);
  const [currentTrackId, setCurrentTrackId] = useState(
    persisted.currentTrackId as string | undefined,
  );
  const [playerState, setPlayerState] = useState("idle" as PlaybackUiState);
  const [status, setStatus] = useState("输入 BV 号或 bilibili 链接即可导入");
  const [error, setError] = useState(null as string | null);
  const [loading, setLoading] = useState(false);
  const [downloadTrackId, setDownloadTrackId] = useState(null as string | null);

  const currentTrack = queue.find((track) => track.id === currentTrackId);
  const currentIndex = queue.findIndex((track) => track.id === currentTrackId);

  useEffect(() => {
    player.bind({
      onQueueChange: (nextQueue) => {
        setQueue([...nextQueue]);
      },
      onCurrentTrackChange: (track) => {
        setCurrentTrackId(track?.id);
      },
      onStateChange: (nextState, detail) => {
        setPlayerState(nextState);
        if (detail) setStatus(detail);
      },
      onError: (message) => {
        setError(message);
        setStatus("播放失败");
      },
    });
    player.setQueue(queue);

    return () => {
      player.dispose();
    };
  }, []);

  useEffect(() => {
    player.setQueue(queue);
  }, [queue]);

  useEffect(() => {
    saveState({
      lastInput: input,
      sourceTitle,
      queue,
      currentTrackId,
    });
  }, [input, sourceTitle, queue, currentTrackId]);

  useEffect(() => {
    if (!autoImport || !initialInput) return;
    void handleImport(initialInput);
  }, []);

  async function handleImport(rawInput = input) {
    setLoading(true);
    setError(null);
    setStatus("正在读取 Bilibili 视频信息");

    try {
      const imported = await importFromInput(rawInput);
      setInput(rawInput);
      setSourceTitle(imported.sourceTitle);
      setQueue(imported.tracks);
      setStatus(`已导入 ${imported.tracks.length} 首，点击任意分P开始播放`);
    } catch (importError) {
      const message = importError instanceof Error ? importError.message : String(importError);
      setError(message);
      setStatus("导入失败");
    } finally {
      setLoading(false);
    }
  }

  async function handlePlay(index: number) {
    setError(null);
    try {
      await player.playIndex(index);
      const track = player.getQueue()[index];
      if (track) {
        setCurrentTrackId(track.id);
        setStatus(`正在播放 ${track.title}`);
      }
    } catch (playError) {
      const message = playError instanceof Error ? playError.message : String(playError);
      setError(message);
      setStatus("播放失败");
    }
  }

  async function handleDownload(track: Track) {
    if (Script.env !== "index") {
      setStatus("后台下载只能在 Scripting 主界面里用");
      return;
    }

    try {
      setDownloadTrackId(track.id);
      setStatus(`正在准备下载 ${track.title}`);

      const playReadyTrack = queue.find((item) => item.id === track.id) ?? track;
      const resolvedTrack =
        playReadyTrack.streamUrl || playReadyTrack.localFilePath
          ? playReadyTrack
          : player.getQueue().find((item) => item.id === track.id) ?? playReadyTrack;

      const sourceURL = resolvedTrack.streamUrl;
      if (!sourceURL) {
        setStatus("请先点播一次，再下载当前曲目");
        return;
      }

      const destination = Path.join(
        FileManager.documentsDirectory,
        `${sanitizeFileName(`${track.artist} - ${track.title}`)}-${track.cid}.m4s`,
      );

      const task = BackgroundURLSession.startDownload({
        url: sourceURL,
        destination,
        headers: requestHeaders(),
        notifyOnFinished: {
          success: `${track.title} 下载完成`,
          failure: `${track.title} 下载失败`,
        },
      });

      task.onFinishDownload = (downloadError, info) => {
        setDownloadTrackId(null);
        if (downloadError || !info.destination) {
          setStatus(`下载失败: ${String(downloadError)}`);
          return;
        }

        rememberDownload(track.id, info.destination);
        setQueue((prev) =>
          prev.map((item) =>
            item.id === track.id ? { ...item, localFilePath: info.destination } : item,
          ),
        );
        setStatus(`已缓存到本地: ${track.title}`);
      };

      task.resume();
      setStatus(`后台下载已开始: ${track.title}`);
    } catch (downloadError) {
      setDownloadTrackId(null);
      setStatus(
        downloadError instanceof Error ? downloadError.message : String(downloadError),
      );
    }
  }

  const playerDetail = currentTrack
    ? `${currentTrack.artist} · ${formatDuration(player.getCurrentTime())} / ${formatDuration(
        player.getDuration() || currentTrack.durationSeconds,
      )}`
    : "还没有开始播放";

  return (
    <NavigationStack>
      <Form
        formStyle="grouped"
        toolbar={{
          topBarTrailing: (
            <Button
              title="停止"
              buttonStyle="bordered"
              action={() => {
                player.stop();
                setStatus("已停止播放");
              }}
            />
          ),
        }}
      >
        <Section
          header={<Text>导入 Bilibili</Text>}
          footer={
            <VStack alignment="leading">
              <Text>{status}</Text>
              {error ? <Text>错误: {error}</Text> : null}
            </VStack>
          }
        >
          <TextField
            title="BV / 链接"
            value={input}
            onChanged={setInput}
          />
          <Button
            title={loading ? "导入中..." : "导入视频"}
            buttonStyle="borderedProminent"
            action={() => void handleImport()}
          />
        </Section>

        <Section header={<Text>播放器</Text>}>
          <Text>{currentTrack ? currentTrack.title : "未选择曲目"}</Text>
          <Text>{playerDetail}</Text>
          <Text>状态: {playerState}</Text>
          <HStack>
            <Button
              title="上一首"
              action={() => {
                void player.skip(-1);
              }}
            />
            <Spacer />
            <Button
              title={playerState === "playing" ? "暂停" : "播放"}
              buttonStyle="borderedProminent"
              action={() => {
                if (currentIndex >= 0) {
                  player.toggle();
                } else if (queue.length > 0) {
                  void handlePlay(0);
                }
              }}
            />
            <Spacer />
            <Button
              title="下一首"
              action={() => {
                void player.skip(1);
              }}
            />
          </HStack>
          {currentTrack ? (
            <Button
              title={
                downloadTrackId === currentTrack.id
                  ? "下载中..."
                  : currentTrack.localFilePath
                    ? "已缓存到本地"
                    : "缓存当前曲目"
              }
              action={() => void handleDownload(currentTrack)}
            />
          ) : null}
        </Section>

        <Section header={<Text>{sourceTitle || "播放列表"}</Text>}>
          {queue.length === 0 ? (
            <Text>导入后会在这里看到分P列表。</Text>
          ) : (
            queue.map((track, index) => (
              <VStack alignment="leading" key={track.id}>
                <Button
                  title={`${index === currentIndex ? "▶ " : ""}${index + 1}. ${track.title}`}
                  action={() => void handlePlay(index)}
                />
                <Text>
                  {track.artist}
                  {track.localFilePath ? " · 已缓存" : ""}
                </Text>
              </VStack>
            ))
          )}
        </Section>

        <Section header={<Text>这个 PoC 先验证什么</Text>}>
          <Text>1. Scripting 端能直接带 Header 请求 Bilibili API。</Text>
          <Text>2. AVPlayer 能直接播放 B 站返回的音频流。</Text>
          <Text>3. MediaPlayer 能接锁屏信息和耳机控制。</Text>
          <Text>4. BackgroundURLSession 能把当前曲目缓存到本地文件。</Text>
        </Section>
      </Form>
    </NavigationStack>
  );
}
