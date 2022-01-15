import React, { useEffect, useState, useMemo } from "react";
import { styled } from '@mui/material/styles';
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell, { tableCellClasses } from '@mui/material/TableCell';
import TableContainer from "@mui/material/TableContainer";
import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';

const CRUDIcon = {
    ':hover': {
        cursor: 'pointer'
    },
    width: '0.7em',
    height: '0.7em',
    paddingBottom: '2px',
    color: '#8e5fab'
}

const songText = {
    fontSize: 4,
    minWidth: 0,
    color: '#b395fd'
}

const StyledTableRow = styled(TableRow)(({ theme }) => ({
    '&:nth-of-type(odd)': {
        backgroundColor: theme.palette.action.hover,
    },
    // hide last border
    '&:last-child td, &:last-child th': {
        border: 0,
    },
}));

const StyledTableCell = styled(TableCell)(({ theme }) => ({
    [`&.${tableCellClasses.head}`]: {
        backgroundColor: theme.palette.common.black,
        color: theme.palette.common.white,
    },
    [`&.${tableCellClasses.body}`]: {
        fontSize: 6,
        padding: 0
    },
}));


export const Fav = (function ({ songList, onSongListChange, onSongIndexChange, isFav }) {
    const [songs, setSongs] = useState([])

    useEffect(() => {
        setSongs(songList)
        console.log(songList)
    }, [songList])

    console.log('rener Fav')
    return (
        <TableContainer component={Paper}>
            <Table sx={{ minWidth: 50 }} aria-label="simple table">
                <TableHead>
                    <TableRow>

                    </TableRow>
                </TableHead>
                <TableBody>
                    {songs && songs.map((song, index) =>
                        <StyledTableRow
                            key={index}
                            sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                        >
                            <StyledTableCell component="th" scope="row">
                                {isFav ?
                                    <Button variant="text" sx={songText} onClick={() => onSongIndexChange([song])} >{song.name}</Button> :
                                    <Button variant="text" sx={songText} onClick={() => onSongIndexChange(index)} >{song.name}</Button>
                                }
                            </StyledTableCell>
                            <StyledTableCell align="right" sx={songText}>
                                <a href={"https://space.bilibili.com/"+song.singerId} target="_blank" style={{ color:'inherit', textDecoration: 'none' }} >
                                    {song.singer}
                                </a>
                            </StyledTableCell>
                            <StyledTableCell align="right" sx={{
                                minWidth: 'fit-content', maxWidth: 'fit-content',
                                paddingRight: '8px', width: '0%',
                                whiteSpace: 'nowrap'
                            }}
                                style={{ paddingLeft: '40px', paddingRight: '8px' }}>
                                <AddOutlinedIcon sx={CRUDIcon} />
                                <AddBoxOutlinedIcon sx={CRUDIcon} />
                                <DeleteOutlineOutlinedIcon sx={CRUDIcon} />
                            </StyledTableCell>
                        </StyledTableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer >
    );
})
