import React, { useEffect, useState, useCallback, memo, useContext } from "react";
import { Search } from '../components/Search'
import { Fav } from './Fav'
import { ScrollBar } from "../styles/styles";
import { AlertDialog } from "./ConfirmDialog"
import { AddFavDialog, NewFavDialog } from "./AddFavDialog"
import StorageManagerCtx from '../popup/App'
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay';
import AlbumOutlinedIcon from '@mui/icons-material/AlbumOutlined';
import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import DownloadIcon from '@mui/icons-material/Download';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import AddIcon from '@mui/icons-material/Add';
import Grid from '@mui/material/Grid';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import Box from "@mui/material/Box";
import FiberNewIcon from '@mui/icons-material/FiberNew';

const outerLayerBtn = { padding: 'unset' }

const CRUDBtn = {
    ':hover': {
        cursor: 'default'
    },
    marginTop: '-30px',
    paddingBottom: '30px',
    marginBottom: '-30px',
    paddingTop: '30px',
    paddingLeft: '8px',
    paddingRight: '8px'
}

const CRUDIcon = {
    ':hover': {
        cursor: 'pointer'
    },
    width: '1em',
    height: '1em',
    paddingBottom: '2px',
    color: '#ab5fff'
}

const CRUDIconDisable = {
    ':hover': {
        cursor: 'default'
    },
    width: '0.7em',
    height: '0.7em',
    paddingBottom: '2px',
    color: '##adadad'
}

const AddFavIcon = {
    ':hover': {
        cursor: 'pointer'
    },
    width: '0.7em',
    color: '#ab5fff'
}

const DiskIcon = {
    minWidth: '36px'
}

export const FavList = memo(function ({ onSongListChange, onPlayOneFromFav, onPlayAllFromFav, onAddFavToList, onAddOneFromFav }) {
    const [favLists, setFavLists] = useState(null)
    const [selectedList, setSelectedList] = useState(null)
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
    const [openAddDialog, setOpenAddDialog] = useState(false)
    const [openNewDialog, setOpenNewDialog] = useState(false)
    const [actionFavId, setActionFavId] = useState(null)
    const [actionFavSong, setActionFavSong] = useState(null)
    const [searchList, setSearchList] = useState({ info: { title: '搜索歌单', id: 'Search' }, songList: [] })
    const [songsStoredAsNewFav, setSongsStoredAsNewFav] = useState(null)

    const StorageManager = useContext(StorageManagerCtx)

    useEffect(() => {
        // Caches setter and latest favList in StoreMng
        StorageManager.setFavLists = setFavLists
        StorageManager.initFavLists()

        //console.log(favLists)
    }, [])

    const handleSeach = useCallback((list) => {
        list.info.currentTableInfo = {}
        setSearchList(list)
        setSelectedList(list)
    }, [searchList, selectedList])

    // Delete base on ID of the song
    const handleDelteFromSearchList = useCallback((id, songId, currentTableInfo) => {
        let favList = id == 'FavList-Search' ? searchList : favLists.find(f => f.info.id == id)

        favList.songList = favList.songList.filter(s => s.id != songId)
        favList.info.currentTableInfo = currentTableInfo
        const updatedToList = { ...favList }
        setSelectedList(updatedToList)

        id == 'FavList-Search' ? setSearchList(updatedToList) : StorageManager.updateFavList(updatedToList)
    }, [searchList, selectedList, favLists])

    const onNewFav = (val) => {
        setOpenNewDialog(false)
        if (val) {
            //console.log(val)
            let favList = StorageManager.addFavList(val, favLists)
            if (songsStoredAsNewFav) {
                favList.songList = songsStoredAsNewFav
                setSongsStoredAsNewFav(null)
            }
        }
    }

    const handleDeleteFavClick = (id) => {
        setActionFavId(id)
        setOpenDeleteDialog(true)
    }

    const handleAddToFavClick = (id, song) => {
        setActionFavId(id)
        setActionFavSong(song)
        setOpenAddDialog(true)
    }

    /* 
        3 Scenarios:
            1. Single song add, either from searchList or favList
            2. Whole searchList
            3. Whole favList 
    */
    const onAddFav = (fromId, toId, song) => {
        setOpenAddDialog(false)
        if (toId) {
            let fromList = []
            let newSongList = []
            let toList = favLists.find(f => f.info.id == toId)

            if (song)
                fromList = { songList: [song] }
            else if (fromId == 'FavList-Search')
                fromList = searchList
            else
                fromList = favLists.find(f => f.info.id == fromId) // Handles both single song add and list add

            newSongList = fromList.songList.filter(s => undefined === toList.songList.find(v => v.id == s.id))
            //console.log(fromId, toId)

            const updatedToList = { info: toList.info, songList: newSongList.concat(toList.songList) }
            StorageManager.updateFavList(updatedToList)
        }
    }

    const onDelteFav = (val) => {
        setOpenDeleteDialog(false)
        if (val) {
            const newFavListIDs = favLists.filter(FavId => FavId.info.id != val)
            StorageManager.deletFavList(val, newFavListIDs)
            if (selectedList && selectedList.info.id == val)
                setSelectedList(null)
        }
    }

    const handlePlayListClick = (FavList) => {
        onPlayAllFromFav(FavList.songList)
    }

    const handleAddPlayListClick = (FavList) => {
        onAddFavToList(FavList.songList)
    }

    const exportFav = () => {
        StorageManager.exportStorage()
    }

    const importFav = () => {
        StorageManager.importStorage()
    }

    const onNewSelectedList = (list) => {
        // Resets currentInfo
        list.info.currentTableInfo = {}
        setSelectedList(list)
    }

    return (
        <React.Fragment>
            <Search handleSeach={handleSeach} />

            <Box // Mid Grid -- SideBar
                className={ScrollBar().root}
                style={{ overflow: "auto", maxHeight: "96%" }}
                sx={{ gridArea: "sidebar" }}
            >
                <Grid container spacing={2}>
                    <Grid item xs={9}>
                        <Typography variant="subtitle1" style={{ color: '#9600af94', paddingLeft: '8px' }}>
                            我的歌单
                        </Typography>
                    </Grid>
                    <Grid item xs={3} style={{ textAlign: 'right', paddingRight: '8px' }}>
                        <Tooltip title="新建歌单">
                            <AddIcon sx={AddFavIcon} onClick={() => setOpenNewDialog(true)} />
                        </Tooltip>
                        <Tooltip title="导出歌单">
                            <DownloadIcon sx={AddFavIcon} onClick={() => exportFav()} />
                        </Tooltip>
                        <Tooltip title="导入歌单">
                            <FileUploadIcon sx={AddFavIcon} onClick={() => importFav()} />
                        </Tooltip>
                    </Grid>
                    <NewFavDialog
                        id="NewFav"
                        keepMounted
                        openState={openNewDialog}
                        onClose={onNewFav}
                    />
                </Grid>
                <Divider light />
                <List
                    sx={{ width: '100%' }}
                    component="nav"
                >
                    <React.Fragment key={searchList.id}>
                        <ListItemButton
                            disableRipple
                            sx={outerLayerBtn}
                        >
                            <ListItemButton style={{ maxWidth: 'calc(100% - 84px)' }} onClick={() => onNewSelectedList(searchList)} id={searchList.info.id} >
                                <ListItemIcon sx={DiskIcon}>
                                    <ManageSearchIcon />
                                </ListItemIcon>
                                <ListItemText sx={{ color: '#9c55fac9' }} primaryTypographyProps={{ fontSize: '1.1em' }} primary={searchList.info.title} />
                            </ListItemButton>
                            <Box component="div" sx={CRUDBtn}>
                                <Tooltip title="播放歌单">
                                    <PlaylistPlayIcon sx={CRUDIcon} onClick={() => handlePlayListClick(searchList)} />
                                </Tooltip>
                                <Tooltip title="添加到播放列表">
                                    <PlaylistAddIcon sx={CRUDIcon} onClick={() => handleAddPlayListClick(searchList)} />
                                </Tooltip>
                                <Tooltip title="添加到收藏歌单">
                                    <AddBoxOutlinedIcon sx={CRUDIcon} onClick={() => handleAddToFavClick(searchList.info.id)} />
                                </Tooltip>
                                <Tooltip title="新建为歌单">
                                    <FiberNewIcon 
                                        sx={CRUDIcon} 
                                        onClick={() => {
                                            setSongsStoredAsNewFav(searchList.songList)
                                            setOpenNewDialog(true)
                                        }}/>
                                </Tooltip>
                            </Box>
                        </ListItemButton>
                    </React.Fragment>

                    {favLists && favLists.map((v, i) =>
                        <React.Fragment key={i}>
                            <ListItemButton
                                disableRipple
                                sx={outerLayerBtn}
                            >
                                <ListItemButton style={{ maxWidth: 'calc(100% - 84px)' }} onClick={() => onNewSelectedList(v)} id={v.info.id} >
                                    <ListItemIcon sx={DiskIcon}>
                                        <AlbumOutlinedIcon />
                                    </ListItemIcon>
                                    <ListItemText sx={{ color: '#9600af94' }} primaryTypographyProps={{ fontSize: '1.1em' }} primary={v.info.title} />
                                </ListItemButton>
                                <Box component="div" sx={CRUDBtn}>
                                    <Tooltip title="播放歌单">
                                        <PlaylistPlayIcon sx={CRUDIcon} onClick={() => handlePlayListClick(v)} />
                                    </Tooltip>
                                    <Tooltip title="添加到播放列表">
                                        <PlaylistAddIcon sx={CRUDIcon} onClick={() => handleAddPlayListClick(v)} />
                                    </Tooltip>
                                    <Tooltip title="添加到收藏歌单">
                                        <AddBoxOutlinedIcon sx={CRUDIcon} onClick={() => handleAddToFavClick(v.info.id)} />
                                    </Tooltip>
                                    <Tooltip title="删除歌单">
                                        <DeleteOutlineOutlinedIcon sx={CRUDIcon} onClick={() => handleDeleteFavClick(v.info.id)} />
                                    </Tooltip>
                                </Box>
                            </ListItemButton>
                        </React.Fragment>
                    )}
                </List>
            </Box>
            <Box // Mid Grid -- Fav Detail 
                style={{ maxHeight: "100%", paddingTop: '20px', paddingLeft: '20px', overflow: "auto" }}
                sx={{ gridArea: "Lrc", padding: '0.2em' }}>
                {selectedList &&
                    <Fav FavList={selectedList}
                        onSongListChange={onSongListChange}
                        onSongIndexChange={onPlayOneFromFav}
                        onAddOneFromFav={onAddOneFromFav}
                        handleDelteFromSearchList={handleDelteFromSearchList}
                        handleAddToFavClick={handleAddToFavClick}
                    />}
            </Box>
            <AlertDialog
                id="DeleteFav"
                openState={openDeleteDialog}
                onClose={onDelteFav}
                value={actionFavId}
            />
            {favLists &&
                <AddFavDialog
                    id="AddFav"
                    openState={openAddDialog}
                    onClose={onAddFav}
                    fromId={actionFavId}
                    favLists={favLists.map(v => v.info)}
                    song={actionFavSong}
                />}
        </React.Fragment >
    )
})