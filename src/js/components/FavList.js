import React, { useEffect, useState, useCallback, useRef, memo } from "react";
import ListSubheader from '@mui/material/ListSubheader';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Collapse from '@mui/material/Collapse';
import AlbumOutlinedIcon from '@mui/icons-material/AlbumOutlined';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import StarBorder from '@mui/icons-material/StarBorder';
import { Fav } from './Fav'

export const FavList = memo(function ({ currentAudioList, onSongListChange, onSongIndexChange }) {
    const [open, setOpen] = useState(true);
    const [favLists, setFavLists] = useState([])

    useEffect(() => {
        console.log('fav effect')
        setFavLists(currentAudioList)
    }, [currentAudioList])

    const handleClick = () => {
        setOpen(!open);
    };
    console.log('render favlist')
    return (
        <List
            sx={{ width: '100%', bgcolor: 'background.paper' }}
            component="nav"
        // aria-labelledby="nested-list-subheader"
        // subheader={
        //     <ListSubheader component="div" id="nested-list-subheader">
        //         Nested List Items
        //     </ListSubheader>
        // }
        >
            <ListItemButton onClick={handleClick}>
                <ListItemIcon>
                    <AlbumOutlinedIcon />
                </ListItemIcon>
                <ListItemText sx={{ color: '#9600af94' }} primary="当前歌单" />
                {open ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
            <Collapse in={open} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                    <Fav songList={favLists}
                        onSongListChange={onSongListChange}
                        onSongIndexChange={onSongIndexChange}
                    />
                </List>
            </Collapse>
        </List>
    );
})
