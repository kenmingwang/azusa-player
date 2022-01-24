import React, { useState, useEffect, useContext } from 'react';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import { searchLyricOptions, searchLyric } from '../utils/Data'
import StorageManagerCtx from '../popup/App'
import { Details } from '@mui/icons-material';

export const LyricSearchBar = function ({ SearchKey, SongId, setLyric, setLyricOffset }) {
    const [options, setOptions] = useState([])
    const [value, setValue] = useState('');
    const StorageManager = useContext(StorageManagerCtx)

    // Initializes options
    useEffect(() => {
        searchLyricOptions(SearchKey, setOptions)

    }, [SearchKey])

    useEffect(() => {
        if (options.length == 0)
            return
        async function initLyric() {
            const detail = await StorageManager.getLyricDetail(SongId.toString())
            if (undefined != detail) {
                setLyricOffset(detail.lrcOffset)
                const index = options.findIndex(v => v.songMid == detail.lrc.songMid)
                if (index != -1){
                    onOptionSet({},options[index])
                    return
                }
                else{
                    options.unshift(detail.lrc)
                    setOptions(options)
                }
            }
            onOptionSet({}, options[0])
        }
        initLyric()
    }, [options])

    const onOptionSet = (e, newValue) => {
        if (newValue != undefined) {
            setValue(newValue)
            searchLyric(newValue.songMid, setLyric)
            StorageManager.setLyricDetail(SongId.toString(), newValue)
        }
    }

    // console.log("SearchBarValue:", options)

    return (
        <div>
            <Autocomplete
                disableClearable
                onChange={onOptionSet}
                value={value}
                id="LyricSearchBar"
                options={options}
                sx={{ width: 300 }}
                size="small"
                renderInput={(params) => <TextField {...params} label="歌词选择" />}
                isOptionEqualToValue={(option, value) => option.songMid === value.songMid}
            />
        </div>
    );
}