import React, { useEffect, useState, useCallback, useRef, memo } from "react";
import ListSubheader from '@mui/material/ListSubheader';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import Collapse from '@mui/material/Collapse';
import AlbumOutlinedIcon from '@mui/icons-material/AlbumOutlined';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import Box from "@mui/material/Box";
import { Fav } from './Fav'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { initFavLists } from '../utils/Storage'
import { ScrollBar } from "../styles/styles";

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

const CRUDIconCurrent = {
    ':hover': {
        cursor: 'not-allowed'
    },
    width: '0.7em',
    height: '0.7em',
    paddingBottom: '2px',
}

export const FavList = memo(function ({ currentAudioList, onSongListChange, onSongIndexChange, onPlayOneFromFav }) {
    const [open, setOpen] = useState(new Map());
    const [favLists, setFavLists] = useState(null)
    const [selectedList, setSelectedList] = useState(null)

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
                                    <PlaylistPlayIcon sx={CRUDIcon} />
                                    <AddOutlinedIcon sx={CRUDIcon} onClick={handleAddFav} />
                                    <AddBoxOutlinedIcon sx={CRUDIcon} />
                                    <DeleteOutlineOutlinedIcon sx={CRUDIcon} />
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
        </React.Fragment>
    )
})