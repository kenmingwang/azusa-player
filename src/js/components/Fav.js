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
import Box from "@mui/material/Box";
import { ScrollBar } from "../styles/styles";
import TextField from "@mui/material/TextField";
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

const headerColumns = [
    { id: 'favName', label: '歌曲名', minWidth: '40%' },
    { id: 'favAction', label: '', minWidth: '10%', align: 'center' },
];

const columns = [
    { id: 'name', label: '歌曲名', minWidth: '40%' },
    { id: 'uploader', label: 'UP主', align: 'left', paddingLeft: '0px' },
    {
        id: 'operation',
        label: '操作',
        minWidth: '40%',
        align: 'right',
    }
];

const CRUDIcon = {
    ':hover': {
        cursor: 'pointer'
    },
    width: '0.7em',
    color: '#8e5fab'
}

const songText = {
    fontSize: 4,
    minWidth: 0,
    color: '#ab5fff'
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


export const Fav = (function ({ FavList, onSongListChange, onSongIndexChange, isFav }) {
    const [currentFavList, setCurrentFavList] = useState(null)
    const [rows, setRows] = useState(null)

    useEffect(() => {
        setCurrentFavList(FavList)
        setRows(FavList.songList)
        console.log(FavList)
    }, [FavList])

    const requestSearch = (e) => {
        const searchedVal = e.target.value
        if (searchedVal == '') {
            setRows(FavList.songList)
            return
        }

        const filteredRows = FavList.songList.filter((row) => {
            // const cleanString = row.name.replace('《') // TODO: some english char can't search
            return row.name.includes(searchedVal)
        })
        setRows(filteredRows)
    }

    console.log('rener Fav')
    const className = ScrollBar().root

    return (
        <React.Fragment>
            {currentFavList &&
                <React.Fragment>
                    <Box sx={{ flexGrow: 1, maxHeight: '72px' }} >
                        <Grid container spacing={2} style={{ paddingTop: '8px' }}>
                            <Grid item xs={4} style={{ textAlign: 'left', padding: '0px', paddingLeft: '16px', paddingTop: '4px' }}>
                                <Typography variant="h6" style={{ color: '#9600af94' }}>
                                    {currentFavList.info.title}
                                </Typography>

                            </Grid>
                            <Grid item xs={4} style={{ textAlign: 'center', padding: '0px' }}>
                                <img style={{ width: '44px', height: '44px' }}
                                    src="https://i0.hdslb.com/bfs/album/cd25f747b454b9006a25c81d5e7650f73c69ef17.gif"></img>
                            </Grid>
                            <Grid item xs={4} style={{ textAlign: 'right', padding: '0px' }}>
                                <TextField
                                    id="outlined-basic"
                                    color="secondary"
                                    size="small"
                                    label="搜索歌曲"
                                    onChange={requestSearch}
                                />
                            </Grid>
                        </Grid>
                    </Box>
                    <TableContainer className={className} id='FavTable' component={Paper} sx={{ maxHeight: "calc(100% - 44px)" }} style={{ overflow: "auto" }} >
                        <Table sx={{ minWidth: 50 }} stickyHeader aria-label="sticky table" >
                            <TableHead>
                                <TableRow>
                                    {columns.map((column) => (
                                        <TableCell
                                            key={column.id}
                                            align={column.align}
                                            style={{ maxWidth: column.minWidth, minWidth: column.minWidth, paddingLeft: column.paddingLeft }}
                                        >
                                            {column.label}{column.id == 'name' ? '(' + currentFavList.songList.length + ')' : ''}
                                        </TableCell>))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rows.map((song, index) =>
                                    <StyledTableRow
                                        key={index}
                                        sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                                    >
                                        <StyledTableCell align="left" sx={{
                                            paddingLeft: '8px', width: '48%',
                                            whiteSpace: 'nowrap'
                                        }}
                                            style={{ paddingLeft: '10px' }}>
                                            <Button variant="text" sx={songText} onClick={() => onSongIndexChange([song])} >{song.name}</Button>
                                        </StyledTableCell>
                                        <StyledTableCell align="left" sx={songText}>
                                            <a href={"https://space.bilibili.com/" + song.singerId} target="_blank" style={{ color: 'inherit', textDecoration: 'none' }} >
                                                {song.singer}
                                            </a>
                                        </StyledTableCell>
                                        <StyledTableCell align="right" sx={{
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
                </React.Fragment>
            }
        </React.Fragment>
    );
})
