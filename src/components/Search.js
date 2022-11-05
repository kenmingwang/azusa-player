import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import React, { useState } from "react";
import { getSongList, getFavList, getBiliSeriesList, getBiliColleList, getBiliChannelList } from '../background/DataProcess'
import CircularProgress from '@mui/material/CircularProgress';

export const Search = function ({ handleSeach }) {

    const [searchValue, setSearchValue] = useState('')
    const [Loading, setLoading] = useState(false)

    const onSearchTextChange = (e) => {
        setSearchValue(e.target.value)
    }
    const keyPress = (e) => {
        // Enter clicked
        if (e.keyCode == 13) {
            const input = e.target.value
            setLoading(true)
            //console.log('value', input); // Validation of target Val    
            // Handles BV search    
            let reExtracted = /.*\.com\/(\d+)\/channel\/seriesdetail\?sid=(\d+).*/.exec(input)
            if (reExtracted !== null) {
                getBiliSeriesList(reExtracted[1], reExtracted[2])
                    .then((songs) => {
                        const list = {
                            songList: songs,
                            info: { title: `搜索合集- 用户${reExtracted[1]}的合集${reExtracted[2]}`, id: ('FavList-' + 'Search') }
                        }
                        handleSeach(list)
                    })
                    .catch((error) => {
                        console.log(error)
                        const list = {
                            songList: [],
                            info: { title: `搜索合集出错- 用户${reExtracted[1]}的合集${reExtracted[2]}`, id: ('FavList-' + 'Search') }
                        }
                        handleSeach(list)
                    })
                    .finally(() => setLoading(false))
                return null
            }
            
            reExtracted = /.*\.com\/(\d+)\/channel\/collectiondetail\?sid=(\d+).*/.exec(input)
            if (reExtracted !== null) {
                getBiliColleList(reExtracted[1], reExtracted[2])
                    .then((songs) => {
                        const list = {
                            songList: songs,
                            info: { title: `搜索合集- 用户${reExtracted[1]}的合集${reExtracted[2]}`, id: ('FavList-' + 'Search') }
                        }
                        handleSeach(list)
                    })
                    .catch((error) => {
                        console.log(error)
                        const list = {
                            songList: [],
                            info: { title: `搜索合集出错- 用户${reExtracted[1]}的合集${reExtracted[2]}`, id: ('FavList-' + 'Search') }
                        }
                        handleSeach(list)
                    })
                    .finally(() => setLoading(false))
                return null
            }
            
            //https://www.bilibili.com/video/BV1se4y147qM/
            reExtracted = /.*space.bilibili\.com\/(\d+)\/video.*/.exec(input)
            if (reExtracted !== null) {
                getBiliChannelList(reExtracted[1])
                    .then((songs) => {
                        const list = {
                            songList: songs,
                            info: { title: `搜索合集- 用户${reExtracted[1]}的所有视频`, id: ('FavList-' + 'Search') }
                        }
                        handleSeach(list)
                    })
                    .catch((error) => {
                        console.log(error)
                        const list = {
                            songList: [],
                            info: { title: `搜索合集出错- 用户${reExtracted[1]}的所有视频`, id: ('FavList-' + 'Search') }
                        }
                        handleSeach(list)
                    })
                    .finally(() => setLoading(false))
                return null
            }
            if (input.startsWith('BV')) {
                getSongList(input)
                    .then((songs) => {
                        const list = {
                            songList: songs,
                            info: { title: '搜索歌单-' + input, id: ('FavList-' + 'Search') }
                        }
                        handleSeach(list)
                    })
                    .catch((error) => {
                        //console.log(error)
                        const list = {
                            songList: [],
                            info: { title: '搜索歌单-' + input, id: ('FavList-' + 'Search') }
                        }
                        handleSeach(list)

                    })
                    .finally(() => setLoading(false))
            }
            // Handles Fav search
            else {
                getFavList(input)
                    .then((songs) => {
                        const list = {
                            songList: songs,
                            info: { title: '搜索歌单-' + input, id: ('FavList-' + 'Search') }
                        }
                        handleSeach(list)
                    })
                    .catch((error) => {
                        console.log(error)
                        const list = {
                            songList: [],
                            info: { title: '搜索歌单-' + input, id: ('FavList-' + 'Search') }
                        }
                        handleSeach(list)
                    })
                    .finally(() => setLoading(false))
            }

        }
    }

    return (
        <React.Fragment>
            <Box // Top Grid -- Search  
                sx={{
                    gridArea: "search",
                }}
                style={{ paddingTop: '12px' }}
            >
                <Box // Serch Grid -- SearchBox
                    sx={{ mx: "auto", textAlign: "center" }}>
                    <TextField
                        id="outlined-basic"
                        color="secondary"
                        label="BVid/fid"
                        placeholder="BV1w44y1b7MX/1303535681"
                        onKeyDown={keyPress}
                        onChange={onSearchTextChange}
                        value={searchValue}
                    />
                    {Loading ? <CircularProgress sx={{ paddingLeft: '16px', paddingRight: '16px', }} /> : ''}
                </Box>
            </Box>
        </React.Fragment>
    )
}