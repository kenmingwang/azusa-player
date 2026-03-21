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
  info: { id: string; title: string; currentTableInfo?: Record<string, any> };
  songList: SongLike[];
}

interface FavProps {
  FavList: FavLike;
  onSongListChange?: (songs: any[]) => void;
  onSongIndexChange: (songs: any[]) => void;
  onAddOneFromFav: (songs: any[]) => void;
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
  width: '0.85em',
  height: '0.85em',
  color: '#8e5fab',
};

const songText = {
  fontSize: 15,
  minWidth: 0,
  color: '#ab5fff',
  textTransform: 'none',
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
    fontSize: 15,
    padding: 0,
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
  onSongIndexChange,
  onAddOneFromFav,
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

  useEffect(() => {
    setCurrentFavList(FavList);
    setRows(FavList.songList || []);

    const currentInfo = FavList.info.currentTableInfo || {};
    setPage(currentInfo.page ?? 0);
    setRowsPerPage(currentInfo.rowsPerPage ?? 25);

    requestSearch(currentInfo.filterString ?? '');
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

  const selectedSongs = useMemo(
    () => (currentFavList?.songList || []).filter((s) => selectedSongIds.includes(s.id)),
    [selectedSongIds, currentFavList],
  );

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
        <>
          <Box sx={{ flexGrow: 1, maxHeight: '92px' }}>
            <Grid container spacing={1.5} style={{ paddingTop: '8px' }}>
              <Grid item xs={4} style={{ textAlign: 'left', paddingLeft: '16px', paddingTop: '4px' }}>
                <Typography variant='h6' style={{ color: '#9600af94', whiteSpace: 'nowrap', fontSize: '1rem' }}>
                  {currentFavList.info.title}
                </Typography>
              </Grid>
              <Grid item xs={4} style={{ textAlign: 'center' }}>
                <img style={{ width: '44px', height: '44px' }} src={getRandomHeaderGIF()} alt='header' />
              </Grid>
              <Grid item xs={4} style={{ textAlign: 'right', paddingRight: '8px' }}>
                <TextField
                  id='fav-search'
                  color='secondary'
                  size='small'
                  label='搜索歌曲'
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => requestSearch(e.target.value)}
                  value={filterString}
                />
              </Grid>
              <Grid item xs={12} style={{ textAlign: 'right', paddingRight: '8px' }}>
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
              </Grid>
            </Grid>
          </Box>

          <TableContainer className={className} id='FavTable' component={Paper} sx={{ maxHeight: 'calc(100% - 64px)' }}>
            <Table stickyHeader aria-label='fav table'>
              <TableHead>
                <TableRow>
                  {columns.map((column) => (
                    <TableCell key={column.id} align={(column as any).align} sx={{ width: column.minWidth }}>
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
                  <StyledTableRow key={`${song.id}-${index}`} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <StyledTableCell align='center'>
                      <Checkbox size='small' checked={selectedSongIds.includes(song.id)} onChange={() => toggleSong(song.id)} />
                    </StyledTableCell>
                    <StyledTableCell align='left' sx={{ paddingLeft: '8px', width: '40%', whiteSpace: 'nowrap' }}>
                      <Button variant='text' sx={songText} onClick={() => onSongIndexChange([song])}>
                        {song.name}
                      </Button>
                    </StyledTableCell>
                    <StyledTableCell align='center' sx={{ minWidth: 0, color: '#ab5fff' }}>
                      <a href={`https://space.bilibili.com/${song.singerId}`} target='_blank' rel='noreferrer' style={{ color: 'inherit', textDecoration: 'none' }}>
                        {song.singer}
                      </a>
                    </StyledTableCell>
                    <StyledTableCell align='right' sx={{ pr: 1.5, width: '40%', whiteSpace: 'nowrap' }}>
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
                    </StyledTableCell>
                  </StyledTableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <ThemeProvider theme={theme}>
                    <TablePagination
                      rowsPerPageOptions={[25, 75, 100]}
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
        </>
      ) : null}
    </>
  );
};

