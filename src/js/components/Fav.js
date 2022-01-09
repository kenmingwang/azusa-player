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
import { BiliBiliIcon } from "../../img/bilibiliIcon";

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

export const Fav = ( function ({ songList, onSongListChange, onSongIndexChange }) {
    const [ songs, setSongs ] = useState([])


    useEffect(()=>{
        setSongs(songList)
    },[songList])
    console.log('rener Fav')
    return (
        <TableContainer component={Paper}>
            <Table sx={{ minWidth: 50 }} aria-label="simple table">
                <TableHead>
                    <TableRow>

                    </TableRow>
                </TableHead>
                <TableBody>
                    {songs && songs.map((song, index) => (
                        <StyledTableRow
                            key={index}
                            sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                        >
                            <StyledTableCell component="th" scope="row">
                                <Button variant="text" sx={{ fontSize: 4 }} onClick={() => onSongIndexChange(index)} >{song.name}</Button>
                            </StyledTableCell>
                            <StyledTableCell align="right" sx={{ fontSize: 4 }}>{song.singer}</StyledTableCell>
                            <StyledTableCell align="right" sx={{ minWidth: 100 }}>
                                <AddOutlinedIcon sx={{ width: '0.7em', height: '0.7em', paddingBottom: '2px' }} />
                                <AddBoxOutlinedIcon sx={{ width: '0.7em', height: '0.7em', paddingBottom: '2px' }} />
                                <DeleteOutlineOutlinedIcon sx={{ width: '0.7em', height: '0.7em', paddingBottom: '2px' }} />
                                <BiliBiliIcon sx={{ width: '0.7em', height: '0.7em', paddingBottom: '2px' }} />

                            </StyledTableCell>
                        </StyledTableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
})
