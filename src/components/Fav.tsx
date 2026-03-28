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

interface FavProps {
  FavList: FavLike;
  currentAudioId?: string;
  onSongListChange?: (songs: any[]) => void;
  onSongIndexChange: (songs: any[]) => void;
  onAddOneFromFav: (songs: any[]) => void;
  onRefreshFromSource?: (list: any) => void;
  handleDelteFromSearchList: (id: string, songId: string, tableInfo: Record<string, any>) => void;
  handleAddToFavClick: (id: string, songs: any[]) => void;
  handleDeleteSongs: (id: string, songIds: string[], tableInfo: Record<string, any>) => void;
  handleRenameSong: (id: string, songId: string, newName: string, tableInfo: Record<string, any>) => void;
}

const theme = createTheme({ palette: { primary: { main: '#1976d2' } } }, zhCN);

const columns = [
  { id: 'check', label: '', minWidth: '5%' },
  { id: 'name', label: '歌曲名', minWidth: '45%' },
  { id: 'uploader', label: 'UP主', align: 'center', minWidth: '20%' },
  { id: 'operation', label: '操作', minWidth: '30%', align: 'right' },
] as const;

const CRUDIcon = {
  ':hover': { cursor: 'pointer' },
  width: '1.05em',
  height: '1.05em',
  color: '#8e5fab',
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
                        <Button size='small' onClick={() => onRefreshFromSource?.(currentFavList)}>
                          刷新来源
                        </Button>
                      </span>
                    </Tooltip>
                  ) : null}
                </Box>
              </Grid>
            </Grid>
          </Box>

          <TableContainer className={className} id='FavTable' component={Paper} sx={{ flex: 1, minHeight: 0 }}>
            <Table stickyHeader aria-label='fav table' size='small' sx={{ tableLayout: 'fixed', minWidth: 560 }}>
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
                    <StyledTableCell align='left' sx={{ width: '45%', minWidth: 0, overflow: 'hidden' }}>
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
                    <StyledTableCell align='center' sx={{ minWidth: 0, color: '#ab5fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <a href={`https://space.bilibili.com/${song.singerId}`} target='_blank' rel='noreferrer' style={{ color: 'inherit', textDecoration: 'none' }}>
                        {song.singer}
                      </a>
                    </StyledTableCell>
                    <StyledTableCell align='right' sx={{ width: '30%', minWidth: 0 }}>
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.75 }}>
                        <Tooltip title='加入播放列表'>
                          <AddOutlinedIcon sx={CRUDIcon} onClick={() => onAddOneFromFav([song])} />
                        </Tooltip>
                        <Tooltip title='添加到歌单'>
                          <AddBoxOutlinedIcon sx={CRUDIcon} onClick={() => handleAddToFavClick(currentFavList.info.id, [song])} />
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
                      colSpan={4}
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
    </>
  );
};

