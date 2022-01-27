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
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import AddIcon from '@mui/icons-material/Add';
import Grid from '@mui/material/Grid';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import Box from "@mui/material/Box";

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
    width: '0.7em',
    height: '0.7em',
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

    const StorageManager = useContext(StorageManagerCtx)

    useEffect(() => {
        // Caches setter and latest favList in StoreMng
        StorageManager.setFavLists = setFavLists
        StorageManager.initFavLists()

        //console.log(favLists)
    }, [])

    const handleSeach = useCallback((list) => {
        setSearchList(list)
        setSelectedList(list)
    }, [searchList, selectedList])

    const handleDelteFromSearchList = useCallback((id, index) => {
        let favList = id == 'Search' ? searchList : favLists.find(f => f.info.id == id)

        favList.songList.splice(index, 1)
        const updatedToList = { ...favList }

        id == 'Search' ? setSearchList(updatedToList) : StorageManager.updateFavList(updatedToList)
    }, [searchList, selectedList, favLists])

    const onNewFav = (val) => {
        setOpenNewDialog(false)
        if (val) {
            //console.log(val)
            StorageManager.addFavList(val, favLists)
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

    const onAddFav = (fromId, toId, song) => {
        setOpenAddDialog(false)
        if (toId) {
            let fromList = []
            let newSongList = []
            let toList = favLists.find(f => f.info.id == toId)
            if (fromId == 'FavList-Search')
                fromList = searchList
            else
                fromList = song ? { songList: [song] } : favLists.find(f => f.info.id == fromId) // Handles both single song add and list add

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
                        <AddIcon sx={AddFavIcon} onClick={()=>setOpenNewDialog(true)} />
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
                            <ListItemButton style={{ maxWidth: 'calc(100% - 84px)' }} onClick={() => setSelectedList(searchList)} id={searchList.info.id} >
                                <ListItemIcon sx={DiskIcon}>
                                    <ManageSearchIcon />
                                </ListItemIcon>
                                <ListItemText sx={{ color: '#9c55fac9' }} primaryTypographyProps={{ fontSize: '1.1em' }} primary={searchList.info.title} />
                            </ListItemButton>
                            <Box component="div" sx={CRUDBtn}>
                                <PlaylistPlayIcon sx={CRUDIcon} onClick={() => handlePlayListClick(searchList)} />
                                <PlaylistAddIcon sx={CRUDIcon} onClick={() => handleAddPlayListClick(searchList)} />
                                <AddBoxOutlinedIcon sx={CRUDIcon} onClick={() => handleAddToFavClick(searchList.info.id)} />
                                <DeleteOutlineOutlinedIcon sx={CRUDIconDisable} />
                            </Box>
                        </ListItemButton>
                    </React.Fragment>

                    {favLists && favLists.map((v, i) =>
                        <React.Fragment key={i}>
                            <ListItemButton
                                disableRipple
                                sx={outerLayerBtn}
                            >
                                <ListItemButton style={{ maxWidth: 'calc(100% - 84px)' }} onClick={() => setSelectedList(v)} id={v.info.id} >
                                    <ListItemIcon sx={DiskIcon}>
                                        <AlbumOutlinedIcon />
                                    </ListItemIcon>
                                    <ListItemText sx={{ color: '#9600af94' }} primaryTypographyProps={{ fontSize: '1.1em' }} primary={v.info.title} />
                                </ListItemButton>
                                <Box component="div" sx={CRUDBtn}>
                                    <PlaylistPlayIcon sx={CRUDIcon} onClick={() => handlePlayListClick(v)} />
                                    <PlaylistAddIcon sx={CRUDIcon} onClick={() => handleAddPlayListClick(v)} />
                                    <AddBoxOutlinedIcon sx={CRUDIcon} onClick={() => handleAddToFavClick(v.info.id)} />
                                    <DeleteOutlineOutlinedIcon sx={CRUDIcon} onClick={() => handleDeleteFavClick(v.info.id)} />
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