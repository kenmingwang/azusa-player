import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import React, { useEffect, useState, useContext } from "react";
import {getSongList} from '../background/DataProcess'
import StorageManagerCtx from '../popup/App'
import { SearchDialog } from "./SearchDialog";

export const Search = function ({handleSeach}) {

    const [searchValue, setSearchValue] = useState('')

    const onSearchTextChange = (e) => {
        setSearchValue(e.target.value)
    }
    const keyPress = (e) => {
        // Enter clicked
        if (e.keyCode == 13) {
            console.log('value', e.target.value); // Validation of target Val
            getSongList(e.target.value).then((songs)=>{
                const list = {
                    songList: songs,
                    info: { title: '搜索歌单', id: ('FavList-' + 'Search') }
                }
                handleSeach(list)
            })
            
        }
    }

    return (
        <React.Fragment>
            <Box // Top Grid -- Search  
                sx={{
                    gridArea: "search", 
                }}
                style={{paddingTop:'12px'}}
            >
                <Box // Serch Grid -- SearchBox
                    sx={{ mx: "auto", textAlign: "center" }}>
                    <TextField
                        id="outlined-basic"
                        color="secondary"
                        label="BVid"
                        placeholder="BV1w44y1b7MX"
                        onKeyDown={keyPress}
                        onChange={onSearchTextChange}
                        value={searchValue}
                    />
                </Box>
            </Box>
        </React.Fragment>
    )
}