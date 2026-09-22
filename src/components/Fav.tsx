import React, { useEffect, useMemo, useState } from 'react';
import { getRandomHeaderGIF } from '../utils/Data';
import { ScrollBar } from '../styles/styles';
import { styled } from '@mui/material/styles';
import PropTypes from 'prop-types';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell, { tableCellClasses } from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import TableFooter from '@mui/material/TableFooter';
import TablePagination from '@mui/material/TablePagination';
import IconButton from '@mui/material/IconButton';
import FirstPageIcon from '@mui/icons-material/FirstPage';
import KeyboardArrowLeft from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight';
import LastPageIcon from '@mui/icons-material/LastPage';
import { createTheme, ThemeProvider, useTheme } from '@mui/material/styles';
import { zhCN } from '@mui/material/locale';
import Tooltip from '@mui/material/Tooltip';
import Checkbox from '@mui/material/Checkbox';
import DownloadIcon from '@mui/icons-material/Download';
import FolderSharedIcon from '@mui/icons-material/FolderShared';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import LinearProgress from '@mui/material/LinearProgress';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { AudioQualityBadge } from './AudioQuality';
import DownloadDialog, { BROWSER_DOWNLOAD_SUBFOLDER } from './DownloadDialog';
import { downloadSongsToLocal, type DownloadTarget } from '../utils/downloader';
import { describeDownloadDirectory, verifyDirectoryPermission } from '../utils/fileSystemAccess';
import type { SearchSource } from '../background/DataProcess';

interface SongLike {
  id: string;
  name: string;
  singer?: string;
  singerId?: string | number;
  bvid?: string;
  cover?: string;
  musicSrc?: string | (() => Promise<string>);
}

interface FavLike {
  info: { id: string; title: string; currentTableInfo?: Record<string, any>; source?: SearchSource };
  songList: SongLike[];
}

interface DownloadState {
  index: number;
  total: number;
  name: string;
  qualityLabel: string;
}

interface FavProps {
  FavList: FavLike;
  currentAudioId?: string;
  onSongListChange?: (songs: any[]) => void;
  onSongIndexChange: (songs: any[]) => void;
  onAddOneFromFav: (songs: any[]) => void;
  onRefreshFromSource?: (list: any) => void;
  refreshInProgress?: boolean;
  handleDelteFromSearchList: (id: string, songId: string, tableInfo: Record<string, any>) => void;
  handleAddToFavClick: (id: string, songs: any[]) => void;
  handleDeleteSongs: (id: string, songIds: string[], tableInfo: Record<string, any>) => void;
  handleRenameSong: (id: string, songId: string, newName: string, tableInfo: Record<string, any>) => void;
}

const theme = createTheme({ palette: { primary: { main: '#1976d2' } } }, zhCN);

const columns = [
  { id: 'check', label: '', minWidth: '5%' },
  { id: 'name', label: '歌曲名', minWidth: '34%' },
  { id: 'quality', label: '音质', align: 'center', minWidth: '12%' },
  { id: 'uploader', label: 'UP主', align: 'center', minWidth: '17%' },
  { id: 'operation', label: '操作', minWidth: '32%', align: 'right' },
] as const;

const CRUDIcon = {
  ':hover': { cursor: 'pointer' },
  width: '1.05em',
  height: '1.05em',
  color: 'var(--azusa-accent)',
};

const songText = {
  fontSize: 14,
  minWidth: 0,
  color: '#ab5fff',
  textTransform: 'none',
  justifyContent: 'flex-start',
};

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(odd)': { backgroundColor: theme.palette.action.hover },
  '&:last-child td, &:last-child th': { border: 0 },
}));

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    backgroundColor: theme.palette.common.black,
    color: theme.palette.common.white,
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 14,
    padding: '6px 8px',
  },
}));

function TablePaginationActions(props: any) {
  const theme = useTheme();
  const { count, page, rowsPerPage, onPageChange } = props;

  return (
    <Box sx={{ flexShrink: 0, ml: 2.5 }}>
      <IconButton onClick={(e) => onPageChange(e, 0)} disabled={page === 0} aria-label='first page'>
        {theme.direction === 'rtl' ? <LastPageIcon /> : <FirstPageIcon />}
      </IconButton>
      <IconButton onClick={(e) => onPageChange(e, page - 1)} disabled={page === 0} aria-label='previous page'>
        {theme.direction === 'rtl' ? <KeyboardArrowRight /> : <KeyboardArrowLeft />}
      </IconButton>
      <IconButton
        onClick={(e) => onPageChange(e, page + 1)}
        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
        aria-label='next page'
      >
        {theme.direction === 'rtl' ? <KeyboardArrowLeft /> : <KeyboardArrowRight />}
      </IconButton>
      <IconButton
        onClick={(e) => onPageChange(e, Math.max(0, Math.ceil(count / rowsPerPage) - 1))}
        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
        aria-label='last page'
      >
        {theme.direction === 'rtl' ? <FirstPageIcon /> : <LastPageIcon />}
      </IconButton>
    </Box>
  );
}

TablePaginationActions.propTypes = {
  count: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
  page: PropTypes.number.isRequired,
  rowsPerPage: PropTypes.number.isRequired,
};

export const Fav = function ({
  FavList,
  currentAudioId,
  onSongIndexChange,
  onAddOneFromFav,
  onRefreshFromSource,
  refreshInProgress = false,
  handleDelteFromSearchList,
  handleAddToFavClick,
  handleDeleteSongs,
  handleRenameSong,
}: FavProps) {
  const [currentFavList, setCurrentFavList] = useState<FavLike | null>(null);
  const [rows, setRows] = useState<SongLike[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [filterString, setFilterString] = useState('');
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);
  const [highlightSongId, setHighlightSongId] = useState('');
  const [highlightNonce, setHighlightNonce] = useState(0);
  const [downloadState, setDownloadState] = useState<DownloadState | null>(null);
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [downloadNotice, setDownloadNotice] = useState<{ severity: 'success' | 'info' | 'warning' | 'error'; message: string } | null>(null);
  const cancelDownloadRef = React.useRef(false);
  const rowRefs = React.useRef<Record<string, HTMLTableRowElement | null>>({});

  useEffect(() => {
    setCurrentFavList(FavList);
    setRows(FavList.songList || []);

    const currentInfo = FavList.info.currentTableInfo || {};
    setPage(currentInfo.page ?? 0);
    setRowsPerPage(currentInfo.rowsPerPage ?? 25);
    setHighlightSongId(String(currentInfo.highlightSongId || ''));
    setHighlightNonce(Number(currentInfo.highlightNonce || 0));
    requestSearch(currentInfo.highlightSongId ? '' : (currentInfo.filterString ?? ''));
    setSelectedSongIds([]);
  }, [FavList]);

  const requestSearch = (searchedVal: string) => {
    setFilterString(searchedVal);
    if (!searchedVal) {
      setRows(FavList.songList);
      return;
    }

    const lowered = searchedVal.toLowerCase();
    setRows((FavList.songList || []).filter((row) => String(row.name).toLowerCase().includes(lowered)));
  };

  const visibleRows = useMemo(
    () => (rowsPerPage > 0 ? rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage) : rows),
    [rows, page, rowsPerPage],
  );

  const resolvedHighlightSongId = String(highlightSongId || '');
  const resolvedCurrentSongId = String(currentAudioId || '');

  const selectedSongs = useMemo(
    () => (currentFavList?.songList || []).filter((s) => selectedSongIds.includes(s.id)),
    [selectedSongIds, currentFavList],
  );

  useEffect(() => {
    if (!resolvedHighlightSongId) return;
    const highlightedRow = rowRefs.current[resolvedHighlightSongId];
    console.info('[azusa-player][locate]', 'applyHighlight', {
      highlightSongId: resolvedHighlightSongId,
      currentSongId: resolvedCurrentSongId,
      highlightNonce,
      theme: typeof document !== 'undefined' ? document.body?.dataset?.theme || 'light' : 'light',
      page,
      rowsPerPage,
      visibleSongIds: visibleRows.map((song) => String(song.id)),
      rowFound: !!highlightedRow,
    });
    if (!highlightedRow || typeof highlightedRow.scrollIntoView !== 'function') return;
    highlightedRow.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [resolvedHighlightSongId, highlightNonce, page, rowsPerPage, rows]);

  const toggleSong = (songId: string) => {
    setSelectedSongIds((prev) => (prev.includes(songId) ? prev.filter((id) => id !== songId) : [...prev, songId]));
  };

  const togglePageSelect = () => {
    const pageIds = visibleRows.map((s) => s.id);
    const allSelected = pageIds.every((id) => selectedSongIds.includes(id));
    if (allSelected) {
      setSelectedSongIds((prev) => prev.filter((id) => !pageIds.includes(id)));
      return;
    }
    setSelectedSongIds((prev) => [...new Set([...prev, ...pageIds])]);
  };

  const runDownloadSongs = React.useCallback(async (songs: SongLike[]) => {
    const targets = (songs || []).filter((song) => song?.bvid && song?.id);
    if (!targets.length) {
      setDownloadNotice({ severity: 'error', message: '选中的条目缺少 bvid / cid，无法下载。' });
      return;
    }

    // Still inside the click gesture: re-grant the stored folder handle if Chrome downgraded it.
    const downloadTarget: DownloadTarget = { subfolder: BROWSER_DOWNLOAD_SUBFOLDER };
    const { handle, permission } = await describeDownloadDirectory();
    if (handle) {
      if (permission === 'granted' || (await verifyDirectoryPermission(handle, true))) {
        downloadTarget.directoryHandle = handle;
        delete downloadTarget.subfolder;
      }
    }

    cancelDownloadRef.current = false;
    setDownloadState({ index: 0, total: targets.length, name: String(targets[0].name || ''), qualityLabel: '' });

    const summary = await downloadSongsToLocal(targets as any, {
      target: downloadTarget,
      isCancelled: () => cancelDownloadRef.current,
      onProgress: (event) => {
        setDownloadState({
          index: event.index + 1,
          total: event.total,
          name: String(event.song?.name || ''),
          qualityLabel: event.quality?.label || '',
        });
      },
    });

    setDownloadState(null);

    if (summary.succeeded === 0 && summary.skipped === summary.total) {
      setDownloadNotice({ severity: 'info', message: '已取消下载。' });
      return;
    }

    const destination = downloadTarget.directoryHandle ? `所选文件夹「${downloadTarget.directoryHandle.name}」` : '浏览器下载目录';

    if (summary.failed === 0 && summary.skipped === 0) {
      setDownloadNotice({ severity: 'success', message: `已按最高音质下载 ${summary.succeeded} 首到${destination}。` });
      return;
    }

    setDownloadNotice({
      severity: summary.succeeded ? 'warning' : 'error',
      message: `下载完成：成功 ${summary.succeeded} 首，失败 ${summary.failed} 首${
        summary.skipped ? `，取消 ${summary.skipped} 首` : ''
      }。可在「下载记录」查看明细。`,
    });
  }, []);

  const cancelDownload = () => {
    cancelDownloadRef.current = true;
  };

  const tableInfo = { page, rowsPerPage, filterString };
  const className = ScrollBar().root;

  return (
    <>
      {currentFavList ? (
        <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ px: { xs: 0.5, md: 1 }, pt: 0.5 }}>
            <Grid container spacing={1} alignItems='center'>
              <Grid item xs={12} sm={5} md={6}>
                <Typography variant='h6' sx={{ color: '#9600af94', whiteSpace: 'nowrap', fontSize: '1rem' }}>
                  {currentFavList.info.title}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={7} md={6}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1 }}>
                  <img style={{ width: '40px', height: '40px' }} src={getRandomHeaderGIF()} alt='header' />
                  <TextField
                    id='fav-search'
                    color='secondary'
                    size='small'
                    label='搜索歌曲'
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => requestSearch(e.target.value)}
                    value={filterString}
                    sx={{ width: { xs: '100%', sm: '220px' }, maxWidth: '100%' }}
                  />
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 0.75 }}>
                  <Tooltip title='批量加入播放列表'>
                    <span>
                      <Button size='small' disabled={!selectedSongs.length} onClick={() => onAddOneFromFav(selectedSongs)}>
                        加入播放列表({selectedSongs.length})
                      </Button>
                    </span>
                  </Tooltip>
                  <Tooltip title='批量添加到其它歌单'>
                    <span>
                      <Button
                        size='small'
                        disabled={!selectedSongs.length}
                        onClick={() => handleAddToFavClick(currentFavList.info.id, selectedSongs)}
                      >
                        添加到歌单
                      </Button>
                    </span>
                  </Tooltip>
                  <Tooltip title='批量下载选中歌曲到本地（自动取最高音质）'>
                    <span>
                      <Button
                        size='small'
                        data-testid='batch-download-songs'
                        disabled={!selectedSongs.length}
                        onClick={() => runDownloadSongs(selectedSongs)}
                      >
                        批量下载({selectedSongs.length})
                      </Button>
                    </span>
                  </Tooltip>
                  <Tooltip title='下载位置与下载记录'>
                    <span>
                      <Button
                        size='small'
                        startIcon={<FolderSharedIcon fontSize='small' />}
                        data-testid='open-download-dialog'
                        onClick={() => setDownloadDialogOpen(true)}
                      >
                        下载记录
                      </Button>
                    </span>
                  </Tooltip>
                  <Tooltip title='批量删除选中歌曲'>
                    <span>
                      <Button
                        size='small'
                        color='error'
                        disabled={!selectedSongs.length}
                        onClick={() => handleDeleteSongs(currentFavList.info.id, selectedSongIds, tableInfo)}
                      >
                        删除选中
                      </Button>
                    </span>
                  </Tooltip>
                  {currentFavList.info.source ? (
                    <Tooltip title='按原始来源刷新歌单'>
                      <span>
                        <Button size='small' disabled={refreshInProgress} onClick={() => onRefreshFromSource?.(currentFavList)}>
                          {refreshInProgress ? '刷新中' : '刷新来源'}
                        </Button>
                      </span>
                    </Tooltip>
                  ) : null}
                </Box>
              </Grid>
            </Grid>
          </Box>

          <TableContainer className={className} id='FavTable' component={Paper} sx={{ flex: 1, minHeight: 0 }}>
            <Table stickyHeader aria-label='fav table' size='small' sx={{ tableLayout: 'fixed', minWidth: 640 }}>
              <TableHead>
                <TableRow>
                  {columns.map((column) => (
                    <TableCell key={column.id} align={(column as any).align} sx={{ width: column.minWidth, whiteSpace: 'nowrap' }}>
                      {column.id === 'check' ? (
                        <Checkbox
                          size='small'
                          checked={visibleRows.length > 0 && visibleRows.every((song) => selectedSongIds.includes(song.id))}
                          indeterminate={
                            visibleRows.some((song) => selectedSongIds.includes(song.id)) &&
                            !visibleRows.every((song) => selectedSongIds.includes(song.id))
                          }
                          onChange={togglePageSelect}
                        />
                      ) : (
                        <>
                          {column.label}
                          {column.id === 'name' ? ` (${currentFavList.songList.length})` : ''}
                        </>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleRows.map((song, index) => (
                  <StyledTableRow
                    key={`${song.id}-${index}`}
                    ref={(node) => {
                      rowRefs.current[String(song.id)] = node;
                    }}
                    data-highlighted={String(song.id) === resolvedHighlightSongId ? 'true' : 'false'}
                    data-current-audio={String(song.id) === resolvedCurrentSongId ? 'true' : 'false'}
                    sx={{
                      '&:last-child td, &:last-child th': { border: 0 },
                      ...(String(song.id) === resolvedCurrentSongId
                        ? {
                            backgroundColor: 'rgba(171, 95, 255, 0.1)',
                          }
                        : {}),
                      ...(String(song.id) === resolvedHighlightSongId
                        ? {
                            backgroundColor: 'rgba(171, 95, 255, 0.22)',
                            boxShadow: 'inset 0 0 0 2px rgba(171, 95, 255, 0.52), inset 6px 0 0 rgba(171, 95, 255, 0.88)',
                            '& td': {
                              color: '#4f248f',
                              fontWeight: 600,
                            },
                          }
                        : {}),
                    }}
                  >
                    <StyledTableCell align='center'>
                      <Checkbox size='small' checked={selectedSongIds.includes(song.id)} onChange={() => toggleSong(song.id)} />
                    </StyledTableCell>
                    <StyledTableCell align='left' sx={{ width: '34%', minWidth: 0, overflow: 'hidden' }}>
                      <Tooltip title={song.name}>
                        <Button
                          variant='text'
                          sx={{ ...songText, width: '100%', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          onClick={() => onSongIndexChange([song])}
                        >
                          {song.name}
                        </Button>
                      </Tooltip>
                    </StyledTableCell>
                    <StyledTableCell align='center' sx={{ width: '12%', minWidth: 0, whiteSpace: 'nowrap' }}>
                      <AudioQualityBadge bvid={song.bvid} cid={song.id} />
                    </StyledTableCell>
                    <StyledTableCell
                      align='center'
                      sx={{ minWidth: 0, color: '#ab5fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      <a href={`https://space.bilibili.com/${song.singerId}`} target='_blank' rel='noreferrer' style={{ color: 'inherit', textDecoration: 'none' }}>
                        {song.singer}
                      </a>
                    </StyledTableCell>
                    <StyledTableCell align='right' sx={{ width: '32%', minWidth: 0 }}>
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.75 }}>
                        <Tooltip title='加入播放列表'>
                          <AddOutlinedIcon sx={CRUDIcon} onClick={() => onAddOneFromFav([song])} />
                        </Tooltip>
                        <Tooltip title='添加到歌单'>
                          <AddBoxOutlinedIcon sx={CRUDIcon} onClick={() => handleAddToFavClick(currentFavList.info.id, [song])} />
                        </Tooltip>
                        <Tooltip title='下载到本地（最高音质）'>
                          <DownloadIcon
                            data-testid={`download-song-${song.id}`}
                            aria-label={`download-song-${song.id}`}
                            sx={CRUDIcon}
                            onClick={() => runDownloadSongs([song])}
                          />
                        </Tooltip>
                        <Tooltip title='重命名歌曲'>
                          <EditOutlinedIcon
                            sx={CRUDIcon}
                            onClick={() => {
                              const newName = window.prompt('请输入新歌名', song.name);
                              if (newName && newName.trim()) {
                                handleRenameSong(currentFavList.info.id, song.id, newName.trim(), tableInfo);
                              }
                            }}
                          />
                        </Tooltip>
                        <Tooltip title='删除歌曲'>
                          <DeleteOutlineOutlinedIcon
                            sx={CRUDIcon}
                            onClick={() => handleDelteFromSearchList(currentFavList.info.id, song.id, tableInfo)}
                          />
                        </Tooltip>
                      </Box>
                    </StyledTableCell>
                  </StyledTableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <ThemeProvider theme={theme}>
                    <TablePagination
                      rowsPerPageOptions={[25, 50, 100]}
                      colSpan={columns.length}
                      count={rows.length}
                      rowsPerPage={rowsPerPage}
                      page={page}
                      SelectProps={{ inputProps: { 'aria-label': 'rows per page' }, native: true }}
                      onPageChange={(_, newPage) => setPage(newPage)}
                      onRowsPerPageChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                        setRowsPerPage(parseInt(event.target.value, 10));
                        setPage(0);
                      }}
                      ActionsComponent={TablePaginationActions}
                    />
                  </ThemeProvider>
                </TableRow>
              </TableFooter>
            </Table>
          </TableContainer>
        </Box>
      ) : null}

      <Dialog open={!!downloadState} onClose={cancelDownload} maxWidth='xs' fullWidth>
        <DialogTitle>下载到本地</DialogTitle>
        <DialogContent>
          <Typography variant='body2' sx={{ color: '#ab5fff', mb: 1 }}>
            {downloadState
              ? `正在下载 ${Math.min(downloadState.index + 1, downloadState.total)}/${downloadState.total}：${
                  downloadState.name
                }${downloadState.qualityLabel ? `（${downloadState.qualityLabel}）` : ''}`
              : ''}
          </Typography>
          <LinearProgress
            variant='determinate'
            value={downloadState && downloadState.total ? (downloadState.index / downloadState.total) * 100 : 0}
          />
          <Typography variant='caption' sx={{ display: 'block', mt: 1, color: 'var(--azusa-muted)' }}>
            下载会逐个请求并保存；已选文件夹时静默写入该目录，否则落到浏览器下载目录的子目录 {BROWSER_DOWNLOAD_SUBFOLDER}/。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDownload} size='small'>
            取消下载
          </Button>
        </DialogActions>
      </Dialog>

      <DownloadDialog open={downloadDialogOpen} onClose={() => setDownloadDialogOpen(false)} />

      <Snackbar open={!!downloadNotice} autoHideDuration={6000} onClose={() => setDownloadNotice(null)}>
        <Alert onClose={() => setDownloadNotice(null)} severity={downloadNotice?.severity || 'success'} sx={{ width: '100%' }}>
          {downloadNotice?.message || ''}
        </Alert>
      </Snackbar>
    </>
  );
};
