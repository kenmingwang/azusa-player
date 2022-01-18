import React, { useEffect, useState, useCallback, useRef, memo } from "react";
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay';
import AlbumOutlinedIcon from '@mui/icons-material/AlbumOutlined';
import Box from "@mui/material/Box";
import { Fav } from './Fav'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { initFavLists, deletFavList, addFavList } from '../utils/Storage'
import { ScrollBar } from "../styles/styles";
import { AlertDialog } from "./ConfirmDialog"
import { AddFavDialog } from "./AddFavDialog"
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import AddIcon from '@mui/icons-material/Add';
import Grid from '@mui/material/Grid';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';

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

const AddFavIcon = {
    ':hover': {
        cursor: 'pointer'
    },
    width: '0.7em',
    color: '#ab5fff'
}

const CRUDIconCurrent = {
    ':hover': {
        cursor: 'not-allowed'
    },
    width: '0.7em',
    height: '0.7em',
    paddingBottom: '2px',
}

export const FavList = memo(function ({ currentAudioList, onSongListChange, onSongIndexChange, onPlayOneFromFav, onPlayAllFromFav, onAddFavToList }) {
    const [open, setOpen] = useState(new Map());
    const [favLists, setFavLists] = useState(null)
    const [selectedList, setSelectedList] = useState(null)
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [openAddDialog, setOpenAddDialog] = useState(false);
    const [deleteFavId, setDeleteFavId] = useState(null);

    useEffect(() => {
        if (open.get('CurrentPlayList') == undefined)
            setOpen(open.set('CurrentPlayList', true))
    }, [currentAudioList])

    useEffect(() => {
        if (favLists == null)
            return
        favLists.map((v) => {
            if (open.get(v.info.id) == undefined)
                setOpen(open.set(v.info.id, false))
        })
        chrome.storage.onChanged.addListener((changes, area) => {
            console.log(changes, area)
            // if(Object.keys(changes)[0].startsWith('FavList')){
            //     const id = Object.keys(changes)[0]
            //     favLists.push(changes[id].newValue)
            //     setFavLists(favLists)
            // }         

            // if (area === 'local' && changes.options?.newValue) {
            //   const debugMode = Boolean(changes.options.newValue.debug);
            //   console.log('enable debug mode?', debugMode);
            //   setDebugMode(debugMode);
            // }
        });
    }, [favLists])

    useEffect(() => {
        console.log('fav effect')
        initFavLists(setFavLists)

        console.log(favLists)



    }, [])

    const handleClick = useCallback((id, v) => {
        // Need to make a new map as Memo is checking for ref.
        setOpen(new Map(open.set(id, !open.get(id))));
        setSelectedList(v)
        // console.log(open.get('CurrentPlayList'))
    });

    const handleAddFav = () => {
        setOpenAddDialog(true)
    }

    const onAddFav = (val) => {
        setOpenAddDialog(false)
        if (val) {
            console.log(val)
            addFavList(val, favLists, setFavLists)
        }
    }

    const handleDeleteFavClick = (id) => {
        setDeleteFavId(id)
        setOpenDeleteDialog(true)
    }

    const onDelteFav = (val) => {
        setOpenDeleteDialog(false)
        if (val) {
            const newFavListIDs = favLists.filter(FavId => FavId.info.id != val)
            deletFavList(val, newFavListIDs, setFavLists)
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

    console.log('render favlist')
    console.log(favLists)
    return (
        <React.Fragment>
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
                        <AddIcon sx={AddFavIcon} onClick={handleAddFav} />
                    </Grid>
                    <AddFavDialog
                        id="DeleteFav"
                        keepMounted
                        openState={openAddDialog}
                        onClose={onAddFav}
                    />
                </Grid>
                <Divider light />
                <List
                    sx={{ width: '100%' }}
                    component="nav"
                >
                    {favLists && favLists.map((v, i) =>
                        <React.Fragment key={i}>
                            <ListItemButton
                                disableRipple
                                sx={outerLayerBtn}
                            >
                                <ListItemButton onClick={() => handleClick(v.info.id, v)} id={v.info.id} >
                                    <ListItemIcon >
                                        <AlbumOutlinedIcon />
                                    </ListItemIcon>
                                    <ListItemText sx={{ color: '#9600af94' }} primary={v.info.title} />
                                </ListItemButton>
                                <Box component="div" sx={CRUDBtn}>
                                    <PlaylistPlayIcon sx={CRUDIcon} onClick={() => handlePlayListClick(v)} />
                                    <PlaylistAddIcon sx={CRUDIcon} onClick={() => handleAddPlayListClick(v)} />
                                    <AddBoxOutlinedIcon sx={CRUDIcon} />
                                    <DeleteOutlineOutlinedIcon sx={CRUDIcon} onClick={() => handleDeleteFavClick(v.info.id)} />
                                </Box>
                            </ListItemButton>
                        </React.Fragment>
                    )}
                </List>
            </Box>
            <Box // Mid Grid -- Lyric 
                style={{ maxHeight: "100%", paddingTop: '20px', paddingLeft: '20px', overflow: "auto" }}
                sx={{ gridArea: "Lrc", padding: '0.2em' }}>
                {selectedList &&
                    <Fav FavList={selectedList}
                        onSongListChange={onSongListChange}
                        onSongIndexChange={onPlayOneFromFav}
                        isFav={true} />}
            </Box>
            <AlertDialog
                id="DeleteFav"
                openState={openDeleteDialog}
                onClose={onDelteFav}
                value={deleteFavId}
            />
        </React.Fragment >
    )
})