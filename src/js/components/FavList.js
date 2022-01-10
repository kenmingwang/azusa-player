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
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { initFavLists } from '../utils/Storage'

export const FavList = memo(function ({ currentAudioList, onSongListChange, onSongIndexChange, onPlayOneFromFav }) {
    const [open, setOpen] = useState(new Map());
    const [favLists, setFavLists] = useState(null)

    useEffect(() => {
        if (open.get('CurrentPlayList') == undefined)
            setOpen(open.set('CurrentPlayList', true))
    }, [currentAudioList])

    useEffect(() => {
        console.log('fav effect')
        initFavLists(setFavLists)

        console.log(favLists)
    }, [])

    const handleClick = useCallback((id) => {
        // Need to make a new map as Memo is checking for ref.
        setOpen(new Map(open.set(id, !open.get(id))));
        // console.log(open.get('CurrentPlayList'))
    });

    const handleAddFav = () => {

    }

    console.log('render favlist')
    console.log(favLists)
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
            <ListItemButton>
                <ListItemButton onClick={() => handleClick('CurrentPlayList')} key={0}>
                    <ListItemIcon>
                        <AlbumOutlinedIcon />
                    </ListItemIcon>
                    <ListItemText sx={{ color: '#9600af94' }} primary="当前歌单" />
                    {open.get('CurrentPlayList') ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
                <ListItemButton sx={{ maxWidth: 'fit-Content' }}>
                    <AddOutlinedIcon sx={{ width: '0.7em', height: '0.7em', paddingBottom: '2px' }} onClick={handleAddFav} />
                    <AddBoxOutlinedIcon sx={{ width: '0.7em', height: '0.7em', paddingBottom: '2px' }} />
                    <DeleteOutlineOutlinedIcon sx={{ width: '0.7em', height: '0.7em', paddingBottom: '2px' }} />
                </ListItemButton>
            </ListItemButton>
            <Collapse in={open.get('CurrentPlayList')} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                    <Fav songList={currentAudioList}
                        onSongListChange={onSongListChange}
                        onSongIndexChange={onSongIndexChange}
                        isFav={false}
                    />
                </List>
            </Collapse>

            {favLists && favLists.map((v,i) => 
                <div key={v.info.id}>
                    <ListItemButton onClick={handleClick} id={v.info.id} >
                        <ListItemIcon >
                            <AlbumOutlinedIcon />
                        </ListItemIcon>
                        <ListItemText sx={{ color: '#9600af94' }} primary={v.info.title} />
                        {open.get('CurrentPlayList') ? <ExpandLess /> : <ExpandMore />}
                    </ListItemButton>

                    <Collapse in={open.get('CurrentPlayList')} timeout="auto" unmountOnExit >
                        <List component="div" disablePadding >
                            <Fav songList={v.songList}
                                onSongListChange={onSongListChange}
                                onSongIndexChange={onPlayOneFromFav}
                                isFav={true}
                                key={i}
                            />
                        </List>
                    </Collapse>
                </div>
            )}
        </List>
    );
})
