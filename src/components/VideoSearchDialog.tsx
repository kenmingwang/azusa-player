import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Pagination, Stack, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import { getSongList } from '../background/DataProcess';
import type Song from '../objects/Song';
import { searchBilibiliVideos, type VideoSearchItem, type VideoSearchPage } from '../utils/videoSearch';

interface VideoSearchDialogProps {
  keyword: string;
  onClose: () => void;
  onPlay: (songs: Song[]) => void;
  onAdd: (songs: Song[]) => void;
}

export function VideoSearchDialog({ keyword, onClose, onPlay, onAdd }: VideoSearchDialogProps) {
  const [result, setResult] = useState<VideoSearchPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [resolvingBvid, setResolvingBvid] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<{ bvid: string; songs: Song[] } | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const searchIdRef = useRef(0);
  const selectionIdRef = useRef(0);
  const songsCacheRef = useRef(new Map<string, Song[]>());
  const lastRequestedPageRef = useRef(1);

  const loadPage = useCallback(async (page: number) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const requestId = ++searchIdRef.current;
    selectionIdRef.current += 1;
    lastRequestedPageRef.current = page;
    setLoading(true);
    setError('');
    setActionError('');
    setResolvingBvid(null);
    setExpanded(null);
    try {
      const next = await searchBilibiliVideos(keyword, page, controller.signal);
      if (!controller.signal.aborted && requestId === searchIdRef.current) setResult(next);
    } catch (err) {
      if (!controller.signal.aborted && requestId === searchIdRef.current) {
        setError(err instanceof Error ? err.message : '搜索失败，请稍后重试。');
      }
    } finally {
      if (!controller.signal.aborted && requestId === searchIdRef.current) setLoading(false);
    }
  }, [keyword]);

  useEffect(() => {
    void loadPage(1);
    return () => {
      requestRef.current?.abort();
      searchIdRef.current += 1;
      selectionIdRef.current += 1;
    };
  }, [loadPage]);

  const chooseSongs = (songs: Song[], action: 'play' | 'add') => {
    onClose();
    if (action === 'play') onPlay(songs);
    else onAdd(songs);
  };

  const selectVideo = async (video: VideoSearchItem, action: 'play' | 'add') => {
    const selectionId = ++selectionIdRef.current;
    setResolvingBvid(video.bvid);
    setActionError('');
    try {
      const songs = songsCacheRef.current.get(video.bvid) || await getSongList(video.bvid);
      if (selectionId !== selectionIdRef.current) return;
      if (!songs.length) throw new Error('无法获取这个视频的音轨信息，视频可能已失效或受到访问限制。');
      songsCacheRef.current.set(video.bvid, songs);
      if (songs.length === 1) chooseSongs(songs, action);
      else setExpanded({ bvid: video.bvid, songs });
    } catch (err) {
      if (selectionId === selectionIdRef.current) setActionError(err instanceof Error ? err.message : '获取视频失败，请重试。');
    } finally {
      if (selectionId === selectionIdRef.current) setResolvingBvid(null);
    }
  };

  const busy = loading || resolvingBvid !== null;
  const externalSearchUrl = `https://search.bilibili.com/all?keyword=${encodeURIComponent(keyword)}`;

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth='md' aria-labelledby='video-search-title'>
      <DialogTitle id='video-search-title'>搜索 B 站视频：{keyword}</DialogTitle>
      <DialogContent dividers sx={{ minHeight: 260 }} aria-busy={loading}>
        {loading && <Box role='status' sx={{ display: 'flex', gap: 1, alignItems: 'center', py: 2 }}><CircularProgress size={20} />正在搜索…</Box>}
        {error && <Alert severity='warning' sx={{ mb: 2 }} action={<Button color='inherit' disabled={loading} onClick={() => void loadPage(lastRequestedPageRef.current)}>重试</Button>}>{error}</Alert>}
        {actionError && <Alert severity='error' sx={{ mb: 2 }}>{actionError}</Alert>}
        {!loading && result?.videos.length === 0 && <Typography role='status'>没有找到相关视频，试试其他歌名或歌手。</Typography>}
        {result && <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>共 {result.totalResults} 个结果 · 第 {result.page} 页</Typography>}
        <Stack spacing={1} divider={<Divider />}>
          {result?.videos.map((video) => (
            <Box key={video.bvid} sx={{ py: 1 }}>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                {video.cover && <Box component='img' src={video.cover} alt='' loading='lazy' referrerPolicy='no-referrer' sx={{ width: { xs: 88, sm: 140 }, aspectRatio: '16 / 10', objectFit: 'cover', borderRadius: 1 }} />}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography component='a' href={`https://www.bilibili.com/video/${video.bvid}`} target='_blank' rel='noopener noreferrer' sx={{ color: 'text.primary', textDecoration: 'none', overflowWrap: 'anywhere' }}>{video.title}</Typography>
                  <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>UP 主：{video.author} · {video.duration} · {video.playCount.toLocaleString('zh-CN')} 次播放</Typography>
                  <Stack direction='row' spacing={1} sx={{ mt: 1 }}>
                    <Button size='small' disabled={busy} startIcon={resolvingBvid === video.bvid ? <CircularProgress size={14} /> : <PlayArrowIcon />} onClick={() => void selectVideo(video, 'play')}>播放</Button>
                    <Button size='small' disabled={busy} startIcon={<PlaylistAddIcon />} onClick={() => void selectVideo(video, 'add')}>加入歌单</Button>
                  </Stack>
                </Box>
              </Box>
              {expanded?.bvid === video.bvid && (
                <Box sx={{ mt: 1, pl: 1, borderLeft: '2px solid', borderColor: 'divider' }}>
                  <Stack direction='row' justifyContent='space-between' alignItems='center'>
                    <Typography variant='body2'>这个视频有 {expanded.songs.length} 个分 P，请选择：</Typography>
                    <Button size='small' disabled={busy} onClick={() => chooseSongs(expanded.songs, 'add')}>全部加入歌单</Button>
                  </Stack>
                  {expanded.songs.map((song, index) => (
                    <Box key={song.id} sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center', py: 0.5 }}>
                      <Typography variant='body2' sx={{ flex: 1, minWidth: 120 }}>P{index + 1} · {song.name}</Typography>
                      <Button size='small' disabled={busy} onClick={() => chooseSongs([song], 'play')}>播放 P{index + 1}</Button>
                      <Button size='small' disabled={busy} onClick={() => chooseSongs([song], 'add')}>收藏 P{index + 1}</Button>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          ))}
        </Stack>
        {result && result.totalPages > 1 && <Pagination aria-label='搜索结果分页' count={result.totalPages} page={result.page} disabled={busy} onChange={(_, page) => void loadPage(page)} sx={{ display: 'flex', justifyContent: 'center', mt: 2 }} />}
      </DialogContent>
      <DialogActions>
        <Button href={externalSearchUrl} target='_blank' rel='noopener noreferrer'>在 B 站打开搜索</Button>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
}
