import React, { useState, useEffect, useContext } from 'react';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import { searchLyricOptions, searchLyric } from '../utils/Data'
import StorageManagerCtx from '../popup/App'

export const LyricSearchBar = function ({ SearchKey, SongId, setLyric, localOption }) {
    const [options, setOptions] = useState([])
    const [value, setValue] = useState('');
    const StorageManager = useContext(StorageManagerCtx)

    // Initializes options
    useEffect(() => {
        searchLyricOptions(SearchKey, setOptions)

    }, [SearchKey])

    useEffect(() => {
        if (undefined != localOption)
            searchLyric(localOption.lrc.songMid, setLyric)
        else if(options.length > 0 ){
            onOptionSet({}, options[0])
        }
    }, [options, localOption])

    const onOptionSet = (e, newValue) => {
        if (newValue != undefined) {
            setValue(newValue)
            searchLyric(newValue.songMid, setLyric)
            StorageManager.setLyricDetail(SongId.toString(), newValue)
        }
    }

    // //console.log("SearchBarValue:", options)

    return (
        <div>
            <Autocomplete
                disableClearable
                onChange={onOptionSet}
                value={value}
                id="LyricSearchBar"
                options={options}
                sx={{ width: 500 }}
                size="small"
                renderInput={(params) => <TextField {...params} label="歌词选择" />}
                isOptionEqualToValue={(option, value) => option.songMid === value.songMid}
            />
        </div>
    );
}