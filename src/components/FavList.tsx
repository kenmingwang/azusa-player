import React, { useEffect, useState, useCallback, memo, useContext } from 'react';
import { Search } from './Search';
import { Fav } from './Fav';
import { ScrollBar } from '../styles/styles';
import { AlertDialog } from './ConfirmDialog';
import { AddFavDialog, NewFavDialog, HelpDialog } from './AddFavDialog';
import StorageManagerCtx from '../popup/App';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay';
import AlbumOutlinedIcon from '@mui/icons-material/AlbumOutlined';
import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DownloadIcon from '@mui/icons-material/Download';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import AddIcon from '@mui/icons-material/Add';
import Grid from '@mui/material/Grid';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import Box from '@mui/material/Box';
import FiberNewIcon from '@mui/icons-material/FiberNew';
import Badge from '@mui/material/Badge';
import { fetchPlayUrlPromise } from '../utils/Data';

interface SongLike {
  id: string;
  bvid: string;
  name: string;
}

interface FavInfo {
  title: string;
  id: string;
  currentTableInfo?: Record<string, unknown>;
}

interface FavLike {
  info: FavInfo;
  songList: SongLike[];
}

interface FavListProps {
  currentAudioList?: any[];
  onSongListChange?: (songs: any[]) => void;
  onPlayOneFromFav: (songs: any[]) => void;
  onPlayAllFromFav: (songs: any[]) => void;
  onAddFavToList: (songs: any[]) => void;
  onAddOneFromFav: (songs: any[]) => void;
}

const outerLayerBtn = { padding: 'unset' };

const CRUDBtn = {
  ':hover': { cursor: 'default' },
  marginTop: '-30px',
  paddingBottom: '8px',
  marginBottom: '-30px',
  paddingTop: '8px',
  paddingLeft: '8px',
  paddingRight: '8px',
};

const CRUDIcon = {
  ':hover': { cursor: 'pointer' },
  width: '1.2em',
  height: '1.2em',
  paddingBottom: '2px',
  color: '#ab5fff',
};

const AddFavIcon = {
  ':hover': { cursor: 'pointer' },
  width: '0.95em',
  height: '0.95em',
  color: '#ab5fff',
};

const DiskIcon = { minWidth: '36px' };

const cloneWithTableInfo = (list: FavLike, currentTableInfo: Record<string, unknown> = {}): FavLike => ({
  ...list,
  info: {
    ...list.info,
    currentTableInfo,
  },
});

export const FavList = memo(function ({ onSongListChange, onPlayOneFromFav, onPlayAllFromFav, onAddFavToList, onAddOneFromFav }: FavListProps) {
  const [favLists, setFavLists] = useState<FavLike[] | null>(null);
  const [selectedList, setSelectedList] = useState<FavLike | null>(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openNewDialog, setOpenNewDialog] = useState(false);
  const [openHelpDialog, setOpenHelpDialog] = useState(false);
  const [renameTarget, setRenameTarget] = useState<FavLike | null>(null);
  const [actionFavId, setActionFavId] = useState<string | null>(null);
  const [actionSongs, setActionSongs] = useState<SongLike[]>([]);
  const [searchList, setSearchList] = useState<FavLike>({ info: { title: '搜索歌单', id: 'FavList-Search' }, songList: [] });
  const [songsStoredAsNewFav, setSongsStoredAsNewFav] = useState<SongLike[] | null>(null);

  const StorageManager = useContext(StorageManagerCtx) as any;

  useEffect(() => {
    const onRuntimeMessage = (message: any) => {
      if (message.type === 'fav-update') {
        const { fav_id, n } = message.data;
        StorageManager.readLocalStorage(fav_id).then((fav: any) => {
          const idx = StorageManager.latestFavLists.findIndex((f: FavLike) => f.info.id == fav_id);
          if (idx === -1) return;

          const updatedFav = (StorageManager.latestFavLists[idx] = fav);
          updatedFav.songList.slice(0, n).forEach((song: SongLike) => {
            (song as any).musicSrc = () => fetchPlayUrlPromise(song.bvid, song.id);
          });
          setFavLists([...StorageManager.latestFavLists]);
          updatedFav.info.currentTableInfo = {};
          setSelectedList(updatedFav);
        });
      }
    };

    StorageManager.setFavLists = setFavLists;
    StorageManager.initFavLists().then(() => {
      chrome.runtime.onMessage.addListener(onRuntimeMessage);
    });

    return () => {
      chrome.runtime.onMessage.removeListener(onRuntimeMessage);
    };
  }, []);

  const handleSeach = useCallback((list: FavLike) => {
    const next = cloneWithTableInfo(list, {});
    setSearchList(next);
    setSelectedList(next);
  }, []);

  const updateListState = (updatedList: FavLike, currentTableInfo: Record<string, unknown> = {}) => {
    const normalized = cloneWithTableInfo(updatedList, currentTableInfo);
    if (normalized.info.id === 'FavList-Search') {
      setSearchList(normalized);
      setSelectedList(normalized);
      return;
    }
    StorageManager.updateFavList(normalized);
    setSelectedList(normalized);
  };

  const handleDelteFromSearchList = useCallback(
    (id: string, songId: string, currentTableInfo: Record<string, unknown>) => {
      const source = id === 'FavList-Search' ? searchList : favLists?.find((f) => f.info.id === id);
      if (!source) return;
      const updated = { ...source, songList: source.songList.filter((s) => s.id !== songId) };
      updateListState(updated, currentTableInfo);
    },
    [searchList, favLists],
  );

  const handleDeleteSongs = useCallback(
    (id: string, songIds: string[], currentTableInfo: Record<string, unknown>) => {
      if (!songIds?.length) return;
      const source = id === 'FavList-Search' ? searchList : favLists?.find((f) => f.info.id === id);
      if (!source) return;
      const idSet = new Set(songIds);
      const updated = { ...source, songList: source.songList.filter((s) => !idSet.has(s.id)) };
      updateListState(updated, currentTableInfo);
    },
    [searchList, favLists],
  );

  const handleRenameSong = useCallback(
    (id: string, songId: string, newName: string, currentTableInfo: Record<string, unknown>) => {
      if (!newName) return;
      const source = id === 'FavList-Search' ? searchList : favLists?.find((f) => f.info.id === id);
      if (!source) return;
      const updated = {
        ...source,
        songList: source.songList.map((s) => (s.id === songId ? { ...s, name: newName } : s)),
      };
      updateListState(updated, currentTableInfo);
    },
    [searchList, favLists],
  );

  const onNewFav = (val?: string) => {
    setOpenNewDialog(false);
    if (!val) {
      setRenameTarget(null);
      return;
    }

    const newName = String(val).trim();
    if (!newName) {
      setRenameTarget(null);
      return;
    }

    if (renameTarget) {
      const target = favLists?.find((f) => f.info.id === renameTarget.info.id);
      if (target) {
        StorageManager.updateFavList({
          info: { ...target.info, title: newName },
          songList: [...target.songList],
        });
        if (selectedList?.info.id === target.info.id) {
          setSelectedList({ ...selectedList, info: { ...selectedList.info, title: newName } });
        }
      }
      setRenameTarget(null);
      return;
    }

    const favList = StorageManager.addFavList(newName);
    if (songsStoredAsNewFav?.length) {
      favList.songList = songsStoredAsNewFav;
      setSongsStoredAsNewFav(null);
      StorageManager.updateFavList(favList);
    }
  };

  const handleDeleteFavClick = (id: string) => {
    setActionFavId(id);
    setOpenDeleteDialog(true);
  };

  const handleAddToFavClick = (id: string, songs: SongLike[]) => {
    setActionFavId(id);
    setActionSongs(Array.isArray(songs) ? songs : songs ? [songs] : []);
    setOpenAddDialog(true);
  };

  const onAddFav = (fromId?: string | null, toId?: string, songs: SongLike[] = []) => {
    setOpenAddDialog(false);
    if (!toId || !favLists) return;

    let fromSongs: SongLike[] = [];
    const toList = favLists.find((f) => f.info.id === toId);
    if (!toList) return;

    if (songs?.length) {
      fromSongs = songs;
    } else if (fromId === 'FavList-Search') {
      fromSongs = searchList.songList;
    } else {
      const fromList = favLists.find((f) => f.info.id === fromId);
      fromSongs = fromList?.songList || [];
    }

    const newSongList = fromSongs.filter((s) => toList.songList.find((v) => v.id === s.id) === undefined);
    const updatedToList = { info: toList.info, songList: newSongList.concat(toList.songList) };
    StorageManager.updateFavList(updatedToList);
  };

  const onDelteFav = (val?: string) => {
    setOpenDeleteDialog(false);
    if (!val || !favLists) return;

    const newFavLists = favLists.filter((f) => f.info.id !== val);
    StorageManager.deleteFavList(val, newFavLists);
    if (selectedList && selectedList.info.id === val) {
      setSelectedList(null);
    }
  };

  const onNewSelectedList = (list: FavLike) => {
    setSelectedList(cloneWithTableInfo(list, {}));
  };

  return (
    <>
      <Search handleSeach={handleSeach} />

      <Box className={ScrollBar().root} style={{ overflow: 'auto', maxHeight: '96%' }} sx={{ gridArea: 'sidebar' }}>
        <Grid container spacing={2}>
          <Grid item xs={9}>
            <Typography variant='subtitle1' style={{ color: '#9600af94', paddingLeft: '8px' }}>
              我的歌单
            </Typography>
          </Grid>
          <Grid item xs={3} style={{ textAlign: 'right', paddingRight: '8px' }}>
            <Tooltip title='新建歌单'>
              <AddIcon sx={AddFavIcon} onClick={() => { setRenameTarget(null); setOpenNewDialog(true); }} />
            </Tooltip>
            <Tooltip title='导出歌单'>
              <DownloadIcon sx={AddFavIcon} onClick={() => StorageManager.exportStorage()} />
            </Tooltip>
            <Tooltip title='导入歌单'>
              <FileUploadIcon sx={AddFavIcon} onClick={() => StorageManager.importStorage()} />
            </Tooltip>
            <Badge color='secondary' variant='dot' style={{ verticalAlign: 'baseline' }}>
              <Tooltip title='搜索帮助'>
                <HelpOutlineIcon sx={AddFavIcon} onClick={() => setOpenHelpDialog(true)} />
              </Tooltip>
            </Badge>
          </Grid>

          <NewFavDialog id='NewFav' openState={openNewDialog} defaultValue={renameTarget?.info?.title ?? ''} onClose={onNewFav} />
          <HelpDialog id='Help' openState={openHelpDialog} onClose={() => setOpenHelpDialog(false)} />
        </Grid>

        <Divider light />
        <List sx={{ width: '100%' }} component='nav'>
          <React.Fragment key='search-list'>
            <ListItemButton disableRipple sx={outerLayerBtn}>
              <ListItemButton style={{ maxWidth: 'calc(100% - 116px)' }} onClick={() => onNewSelectedList(searchList)} id={searchList.info.id}>
                <ListItemIcon sx={DiskIcon}>
                  <ManageSearchIcon />
                </ListItemIcon>
                <ListItemText sx={{ color: '#9c55fac9' }} primaryTypographyProps={{ fontSize: '1.1em' }} primary={searchList.info.title} />
              </ListItemButton>
              <Box component='div' sx={CRUDBtn}>
                <Tooltip title='播放歌单'>
                  <PlaylistPlayIcon sx={CRUDIcon} onClick={() => onPlayAllFromFav(searchList.songList)} />
                </Tooltip>
                <Tooltip title='加入播放列表'>
                  <PlaylistAddIcon sx={CRUDIcon} onClick={() => onAddFavToList(searchList.songList)} />
                </Tooltip>
                <Tooltip title='添加到歌单'>
                  <AddBoxOutlinedIcon sx={CRUDIcon} onClick={() => handleAddToFavClick(searchList.info.id, searchList.songList)} />
                </Tooltip>
                <Tooltip title='保存为新歌单'>
                  <FiberNewIcon
                    sx={CRUDIcon}
                    onClick={() => {
                      setSongsStoredAsNewFav(searchList.songList);
                      setRenameTarget(null);
                      setOpenNewDialog(true);
                    }}
                  />
                </Tooltip>
              </Box>
            </ListItemButton>
          </React.Fragment>

          {favLists &&
            favLists.map((v, i) => (
              <React.Fragment key={i}>
                <ListItemButton disableRipple sx={outerLayerBtn}>
                  <ListItemButton style={{ maxWidth: 'calc(100% - 116px)' }} onClick={() => onNewSelectedList(v)} id={v.info.id}>
                    <ListItemIcon sx={DiskIcon}>
                      <AlbumOutlinedIcon />
                    </ListItemIcon>
                    <ListItemText sx={{ color: '#9600af94' }} primaryTypographyProps={{ fontSize: '1.1em' }} primary={v.info.title} />
                  </ListItemButton>
                  <Box component='div' sx={CRUDBtn}>
                    <Tooltip title='播放歌单'>
                      <PlaylistPlayIcon sx={CRUDIcon} onClick={() => onPlayAllFromFav(v.songList)} />
                    </Tooltip>
                    <Tooltip title='加入播放列表'>
                      <PlaylistAddIcon sx={CRUDIcon} onClick={() => onAddFavToList(v.songList)} />
                    </Tooltip>
                    <Tooltip title='添加到歌单'>
                      <AddBoxOutlinedIcon sx={CRUDIcon} onClick={() => handleAddToFavClick(v.info.id, v.songList)} />
                    </Tooltip>
                    <Tooltip title='重命名歌单'>
                      <EditOutlinedIcon
                        sx={CRUDIcon}
                        onClick={() => {
                          setRenameTarget(v);
                          setOpenNewDialog(true);
                        }}
                      />
                    </Tooltip>
                    <Tooltip title='删除歌单'>
                      <DeleteOutlineOutlinedIcon sx={CRUDIcon} onClick={() => handleDeleteFavClick(v.info.id)} />
                    </Tooltip>
                  </Box>
                </ListItemButton>
              </React.Fragment>
            ))}
        </List>
      </Box>

      <Box style={{ maxHeight: '100%', paddingTop: '20px', paddingLeft: '20px', overflow: 'auto' }} sx={{ gridArea: 'Lrc', padding: '0.2em' }}>
        {selectedList ? (
          <Fav
            FavList={selectedList}
            onSongListChange={onSongListChange}
            onSongIndexChange={onPlayOneFromFav}
            onAddOneFromFav={onAddOneFromFav}
            handleDelteFromSearchList={handleDelteFromSearchList}
            handleAddToFavClick={handleAddToFavClick}
            handleDeleteSongs={handleDeleteSongs}
            handleRenameSong={handleRenameSong}
          />
        ) : null}
      </Box>

      <AlertDialog id='DeleteFav' openState={openDeleteDialog} onClose={onDelteFav} value={actionFavId ?? undefined} />
      {favLists ? (
        <AddFavDialog
          id='AddFav'
          openState={openAddDialog}
          onClose={onAddFav}
          fromId={actionFavId}
          favLists={favLists.map((v) => v.info)}
          songs={actionSongs}
        />
      ) : null}
    </>
  );
});

