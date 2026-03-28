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
import NearMeIcon from '@mui/icons-material/NearMe';
import Grid from '@mui/material/Grid';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import Box from '@mui/material/Box';
import FiberNewIcon from '@mui/icons-material/FiberNew';
import Badge from '@mui/material/Badge';
import SyncIcon from '@mui/icons-material/Sync';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { fetchPlayUrlPromise } from '../utils/Data';
import { getSongsFromSource, SearchSource } from '../background/DataProcess';
import { browserApi } from '../platform/browserApi';

interface SongLike {
  id: string;
  bvid: string;
  name: string;
}

interface FavInfo {
  title: string;
  id: string;
  currentTableInfo?: Record<string, unknown>;
  source?: SearchSource;
}

interface FavLike {
  info: FavInfo;
  songList: SongLike[];
}

interface FavListProps {
  currentAudioList?: any[];
  currentAudioId?: string;
  darkMode?: boolean;
  onDarkModeChange?: (darkMode: boolean) => void;
  onSongListChange?: (songs: any[]) => void;
  onPlayOneFromFav: (songs: any[]) => void;
  onPlayAllFromFav: (songs: any[]) => void;
  onAddFavToList: (songs: any[]) => void;
  onAddOneFromFav: (songs: any[]) => void;
}

const outerLayerBtn = {
  px: 1,
  py: 0.5,
  borderRadius: 1,
  minHeight: 44,
};

const CRUDBtn = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: 0.35,
  flexShrink: 0,
  ml: 0.5,
  color: '#ab5fff',
};

const CRUDIcon = {
  ':hover': { cursor: 'pointer' },
  width: '1.15em',
  height: '1.15em',
  color: 'inherit',
};

const AddFavIcon = {
  ':hover': { cursor: 'pointer' },
  width: '1.05em',
  height: '1.05em',
  color: '#ab5fff',
};

const DiskIcon = { minWidth: '32px', color: '#7f7f7f' };

const cloneWithTableInfo = (list: FavLike, currentTableInfo: Record<string, unknown> = {}): FavLike => ({
  ...list,
  info: {
    ...list.info,
    currentTableInfo,
  },
});

export const FavList = memo(function ({
  currentAudioId,
  darkMode = false,
  onDarkModeChange,
  onSongListChange,
  onPlayOneFromFav,
  onPlayAllFromFav,
  onAddFavToList,
  onAddOneFromFav,
}: FavListProps) {
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
  const [pendingNewFavPayload, setPendingNewFavPayload] = useState<{ songs: SongLike[]; source?: SearchSource } | null>(null);

  const StorageManager = useContext(StorageManagerCtx) as any;
  const titleColor = darkMode ? '#f2ecff' : '#9600af94';
  const itemTextColor = darkMode ? 'rgba(226, 214, 255, 0.96)' : '#9600af94';
  const searchTextColor = darkMode ? '#d9c3ff' : '#9c55fac9';

  const persistSelectedFavId = useCallback(
    async (favId?: string | null) => {
      if (!favId || favId === 'FavList-Search') return;
      const currentSettings = (await StorageManager.getPlayerSetting()) || {};
      if (currentSettings.selectedFavId === favId) return;
      StorageManager.setPlayerSetting({ ...currentSettings, selectedFavId: favId });
    },
    [StorageManager],
  );

  const selectFavList = useCallback(
    (list: FavLike, currentTableInfo: Record<string, unknown> = {}) => {
      const normalized = cloneWithTableInfo(list, currentTableInfo);
      setSelectedList(normalized);
      void persistSelectedFavId(normalized.info.id);
    },
    [persistSelectedFavId],
  );

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
          selectFavList(updatedFav);
        });
      }
    };

    StorageManager.setFavLists = setFavLists;
    StorageManager.initFavLists().then(() => {
      browserApi.runtime.onMessage.addListener(onRuntimeMessage);
    });

    return () => {
      browserApi.runtime.onMessage.removeListener(onRuntimeMessage);
    };
  }, [StorageManager, selectFavList]);

  const handleSeach = useCallback((list: FavLike) => {
    const next = cloneWithTableInfo(list, {});
    setSearchList(next);
    setSelectedList(next);
  }, []);

  useEffect(() => {
    if (!favLists?.length) return;

    const selectedIsSearch = selectedList?.info.id === 'FavList-Search';
    const selectedExists =
      !!selectedList &&
      !selectedIsSearch &&
      favLists.some((list) => list.info.id === selectedList.info.id);

    if (selectedExists || selectedIsSearch) return;

    let cancelled = false;

    const restoreSelection = async () => {
      const settings = (await StorageManager.getPlayerSetting()) || {};
      if (cancelled) return;

      const restored = favLists.find((list) => list.info.id === settings.selectedFavId) || favLists[0];
      if (restored) {
        selectFavList(restored, restored.info.currentTableInfo || {});
      }
    };

    void restoreSelection();

    return () => {
      cancelled = true;
    };
  }, [favLists, selectedList, StorageManager, selectFavList]);

  const updateListState = (updatedList: FavLike, currentTableInfo: Record<string, unknown> = {}) => {
    const normalized = cloneWithTableInfo(updatedList, currentTableInfo);
    if (normalized.info.id === 'FavList-Search') {
      setSearchList(normalized);
      setSelectedList(normalized);
      return;
    }
    StorageManager.updateFavList(normalized);
    selectFavList(normalized);
  };

  const refreshFromSource = async (list: FavLike) => {
    if (!list.info.source) return;

    const refreshed = {
      ...list,
      songList: await getSongsFromSource(list.info.source),
    };

    updateListState(refreshed, list.info.currentTableInfo || {});
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
      setPendingNewFavPayload(null);
      return;
    }

    const newName = String(val).trim();
    if (!newName) {
      setRenameTarget(null);
      setPendingNewFavPayload(null);
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
          selectFavList({ ...selectedList, info: { ...selectedList.info, title: newName } });
        }
      }
      setRenameTarget(null);
      setPendingNewFavPayload(null);
      return;
    }

    const favList = StorageManager.addFavList(newName);
    if (pendingNewFavPayload?.songs?.length) {
      favList.songList = pendingNewFavPayload.songs;
      favList.info.source = pendingNewFavPayload.source;
      setPendingNewFavPayload(null);
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
    selectFavList(list, {});
  };

  const locateCurrentSong = useCallback(() => {
    if (!currentAudioId) return;

    const candidates = [searchList, ...(favLists || [])];
    const matchedList = candidates.find((list) => list.songList.some((song) => song.id === currentAudioId));
    console.info('[azusa-player][locate]', 'locateCurrentSong', {
      currentAudioId,
      matchedListId: matchedList?.info.id || null,
      matchedListTitle: matchedList?.info.title || null,
    });
    if (!matchedList) return;

    const songIndex = matchedList.songList.findIndex((song) => song.id === currentAudioId);
    const rowsPerPage = Number(matchedList.info.currentTableInfo?.rowsPerPage || 25);
    const page = songIndex >= 0 ? Math.floor(songIndex / rowsPerPage) : 0;

    selectFavList(matchedList, {
        ...(matchedList.info.currentTableInfo || {}),
        page,
        rowsPerPage,
        filterString: '',
        highlightSongId: currentAudioId,
        highlightNonce: Date.now(),
      });
  }, [currentAudioId, favLists, searchList, selectFavList]);

  return (
    <>
      <Search handleSeach={handleSeach} />

      <Box
        className={ScrollBar().root}
        sx={{
          gridArea: 'sidebar',
          minHeight: 0,
          overflow: 'auto',
          px: { xs: 0.5, md: 0.75 },
          pt: { xs: 0.5, md: 0.75 },
          borderLeft: { xs: 'none', md: '1px solid rgba(171, 95, 255, 0.22)' },
          borderTop: { xs: '1px solid rgba(171, 95, 255, 0.22)', md: 'none' },
        }}
      >
        <Grid container alignItems='center' sx={{ px: 0.5, pb: 0.5 }}>
          <Grid item xs={6}>
            <Typography variant='subtitle1' sx={{ color: titleColor }}>
              我的歌单
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 0.5 }}>
              <Tooltip title='新建歌单'>
                <AddIcon
                  sx={AddFavIcon}
                  onClick={() => {
                    setRenameTarget(null);
                    setOpenNewDialog(true);
                  }}
                />
              </Tooltip>
              <Tooltip title='导出歌单'>
                <DownloadIcon sx={AddFavIcon} onClick={() => StorageManager.exportStorage()} />
              </Tooltip>
              <Tooltip title='导入歌单'>
                <FileUploadIcon sx={AddFavIcon} onClick={() => StorageManager.importStorage()} />
              </Tooltip>
              <Badge color='secondary' variant='dot' sx={{ verticalAlign: 'baseline' }}>
              <Tooltip title='搜索帮助'>
                  <HelpOutlineIcon sx={AddFavIcon} onClick={() => setOpenHelpDialog(true)} />
                </Tooltip>
              </Badge>
              <Tooltip title='定位当前播放歌曲'>
                <span>
                  <NearMeIcon sx={{ ...AddFavIcon, opacity: currentAudioId ? 1 : 0.45 }} onClick={locateCurrentSong} />
                </span>
              </Tooltip>
              <Tooltip title={darkMode ? '切换到浅色模式' : '切换到夜间模式'}>
                {darkMode ? (
                  <LightModeIcon sx={AddFavIcon} onClick={() => onDarkModeChange?.(false)} />
                ) : (
                  <DarkModeIcon sx={AddFavIcon} onClick={() => onDarkModeChange?.(true)} />
                )}
              </Tooltip>
            </Box>
          </Grid>

          <NewFavDialog id='NewFav' openState={openNewDialog} defaultValue={renameTarget?.info?.title ?? ''} onClose={onNewFav} />
          <HelpDialog id='Help' openState={openHelpDialog} onClose={() => setOpenHelpDialog(false)} />
        </Grid>

        <Divider light />
        <List sx={{ width: '100%', py: 0.5 }} component='nav'>
          <React.Fragment key='search-list'>
            <ListItemButton
              disableRipple
              sx={outerLayerBtn}
              selected={selectedList?.info.id === searchList.info.id}
              onClick={() => onNewSelectedList(searchList)}
              id={searchList.info.id}
            >
              <ListItemIcon sx={DiskIcon}>
                <ManageSearchIcon />
              </ListItemIcon>
              <ListItemText
                sx={{ color: searchTextColor, minWidth: 0, overflow: 'hidden' }}
                primaryTypographyProps={{ fontSize: '1.02rem', noWrap: true }}
                primary={searchList.info.title}
              />
              <Box component='div' sx={CRUDBtn} onClick={(e) => e.stopPropagation()}>
                <Tooltip title='播放歌单'>
                  <PlaylistPlayIcon sx={CRUDIcon} onClick={() => onPlayAllFromFav(searchList.songList)} />
                </Tooltip>
                <Tooltip title='加入播放列表'>
                  <PlaylistAddIcon sx={CRUDIcon} onClick={() => onAddFavToList(searchList.songList)} />
                </Tooltip>
                <Tooltip title='添加到歌单'>
                  <AddBoxOutlinedIcon sx={CRUDIcon} onClick={() => handleAddToFavClick(searchList.info.id, searchList.songList)} />
                </Tooltip>
                {searchList.info.source ? (
                  <Tooltip title='按原始来源刷新'>
                    <SyncIcon sx={CRUDIcon} onClick={() => refreshFromSource(searchList)} />
                  </Tooltip>
                ) : null}
                <Tooltip title='保存为新歌单'>
                  <FiberNewIcon
                    sx={CRUDIcon}
                    onClick={() => {
                      setPendingNewFavPayload({ songs: searchList.songList, source: searchList.info.source });
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
                <ListItemButton
                  disableRipple
                  sx={outerLayerBtn}
                  selected={selectedList?.info.id === v.info.id}
                  onClick={() => onNewSelectedList(v)}
                  id={v.info.id}
                >
                  <ListItemIcon sx={DiskIcon}>
                    <AlbumOutlinedIcon />
                  </ListItemIcon>
                  <ListItemText
                    sx={{ color: itemTextColor, minWidth: 0, overflow: 'hidden' }}
                    primaryTypographyProps={{ fontSize: '1.02rem', noWrap: true }}
                    primary={v.info.title}
                  />
                  <Box component='div' sx={CRUDBtn} onClick={(e) => e.stopPropagation()}>
                    <Tooltip title='播放歌单'>
                      <PlaylistPlayIcon sx={CRUDIcon} onClick={() => onPlayAllFromFav(v.songList)} />
                    </Tooltip>
                    <Tooltip title='加入播放列表'>
                      <PlaylistAddIcon sx={CRUDIcon} onClick={() => onAddFavToList(v.songList)} />
                    </Tooltip>
                    <Tooltip title='添加到歌单'>
                      <AddBoxOutlinedIcon sx={CRUDIcon} onClick={() => handleAddToFavClick(v.info.id, v.songList)} />
                    </Tooltip>
                    {v.info.source ? (
                      <Tooltip title='按原始来源刷新'>
                        <SyncIcon sx={CRUDIcon} onClick={() => refreshFromSource(v)} />
                      </Tooltip>
                    ) : null}
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

      <Box
        sx={{
          gridArea: 'Lrc',
          minHeight: 0,
          minWidth: 0,
          overflow: 'auto',
          pt: { xs: 0.5, md: 1 },
          pl: { xs: 0.5, sm: 1, md: 1.5 },
          pr: { xs: 0.5, sm: 1, md: 1 },
          pb: 0.5,
        }}
      >
        {selectedList ? (
          <Fav
            FavList={selectedList}
            currentAudioId={currentAudioId}
            onSongListChange={onSongListChange}
            onSongIndexChange={onPlayOneFromFav}
            onAddOneFromFav={onAddOneFromFav}
            onRefreshFromSource={refreshFromSource}
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

