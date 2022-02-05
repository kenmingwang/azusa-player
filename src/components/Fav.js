import React, { useEffect, useState } from "react";
import { getRandomHeaderGIF } from '../utils/Data'
import { ScrollBar } from "../styles/styles";
import { styled } from '@mui/material/styles';
import PropTypes from 'prop-types';
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
import TextField from "@mui/material/TextField";
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import TableFooter from '@mui/material/TableFooter';
import TablePagination from '@mui/material/TablePagination';
import IconButton from '@mui/material/IconButton';
import FirstPageIcon from '@mui/icons-material/FirstPage';
import KeyboardArrowLeft from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight';
import LastPageIcon from '@mui/icons-material/LastPage';
import { createTheme, ThemeProvider, useTheme } from '@mui/material/styles';
import { zhCN } from '@mui/material/locale';

const theme = createTheme(
    {
        palette: {
            primary: { main: '#1976d2' },
        },
    },
    zhCN,
);


const columns = [
    { id: 'name', label: '歌曲名', minWidth: '20%' },
    { id: 'uploader', label: 'UP主', align: 'center', padding: '0px' },
    {
        id: 'operation',
        label: '操作',
        minWidth: '20%',
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

function TablePaginationActions(props) {
    const theme = useTheme();
    const { count, page, rowsPerPage, onPageChange } = props;

    const handleFirstPageButtonClick = (event) => {
        onPageChange(event, 0);
    };

    const handleBackButtonClick = (event) => {
        onPageChange(event, page - 1);
    };

    const handleNextButtonClick = (event) => {
        onPageChange(event, page + 1);
    };

    const handleLastPageButtonClick = (event) => {
        onPageChange(event, Math.max(0, Math.ceil(count / rowsPerPage) - 1));
    };

    return (
        <Box sx={{ flexShrink: 0, ml: 2.5 }}>
            <IconButton
                onClick={handleFirstPageButtonClick}
                disabled={page === 0}
                aria-label="first page"
            >
                {theme.direction === 'rtl' ? <LastPageIcon /> : <FirstPageIcon />}
            </IconButton>
            <IconButton
                onClick={handleBackButtonClick}
                disabled={page === 0}
                aria-label="previous page"
            >
                {theme.direction === 'rtl' ? <KeyboardArrowRight /> : <KeyboardArrowLeft />}
            </IconButton>
            <IconButton
                onClick={handleNextButtonClick}
                disabled={page >= Math.ceil(count / rowsPerPage) - 1}
                aria-label="next page"
            >
                {theme.direction === 'rtl' ? <KeyboardArrowLeft /> : <KeyboardArrowRight />}
            </IconButton>
            <IconButton
                onClick={handleLastPageButtonClick}
                disabled={page >= Math.ceil(count / rowsPerPage) - 1}
                aria-label="last page"
            >
                {theme.direction === 'rtl' ? <FirstPageIcon /> : <LastPageIcon />}
            </IconButton>
        </Box>
    );
}

TablePaginationActions.propTypes = {
    count: PropTypes.number.isRequired,
    onPageChange: PropTypes.func.isRequired,
    page: PropTypes.number.isRequired,
    rowsPerPage: PropTypes.number.isRequired,
};

export const Fav = (function ({ FavList, onSongIndexChange, onAddOneFromFav, handleDelteFromSearchList, handleAddToFavClick }) {
    const [currentFavList, setCurrentFavList] = useState(null)
    const [rows, setRows] = useState(null)
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);

    useEffect(() => {
        setCurrentFavList(FavList)
        setRows(FavList.songList)
        setPage(0)
        setRowsPerPage(25)
        //console.log(FavList)
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

    // Avoid a layout jump when reaching the last page with empty rows.
    const emptyRows =
        page > 0 ? Math.max(0, (1 + page) * rowsPerPage - rows.length) : 0;

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    //console.log('rener Fav')
    const className = ScrollBar().root

    return (
        <React.Fragment>
            {currentFavList &&
                <React.Fragment>
                    <Box sx={{ flexGrow: 1, maxHeight: '72px' }} >
                        <Grid container spacing={2} style={{ paddingTop: '8px' }}>
                            <Grid item xs={4} style={{ textAlign: 'left', padding: '0px', paddingLeft: '16px', paddingTop: '4px' }}>
                                <Typography variant="h6" style={{ color: '#9600af94', whiteSpace: 'nowrap', fontSize: '1rem' }}>
                                    {currentFavList.info.title}
                                </Typography>

                            </Grid>
                            <Grid item xs={4} style={{ textAlign: 'center', padding: '0px' }}>
                                <img style={{ width: '44px', height: '44px' }}
                                    src={getRandomHeaderGIF()}></img>
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
                        <Table stickyHeader aria-label="sticky table" >
                            <TableHead>
                                <TableRow>
                                    {columns.map((column) => (
                                        <TableCell
                                            key={column.id}
                                            align={column.align}
                                            sx={{ width: column.minWidth, paddingLeft: column.paddingLeft, padding: column.padding }}
                                        >
                                            {column.label}{column.id == 'name' ? '(' + currentFavList.songList.length + ')' : ''}
                                        </TableCell>))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {(rowsPerPage > 0
                                    ? rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                    : rows
                                ).map((song, index) =>
                                    <StyledTableRow
                                        key={index}
                                        sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                                    >
                                        <StyledTableCell align="left" sx={{
                                            paddingLeft: '8px', width: '45%',
                                            whiteSpace: 'nowrap'
                                        }}
                                            style={{ paddingLeft: '10px' }}>
                                            <Button variant="text" sx={songText} onClick={() => onSongIndexChange([song])} >{song.name}</Button>
                                        </StyledTableCell>
                                        <StyledTableCell align="center" sx={{
                                            width: '10%', fontSize: 4,
                                            minWidth: 0,
                                            color: '#ab5fff'
                                        }} >
                                            <a href={"https://space.bilibili.com/" + song.singerId} target="_blank" style={{ color: 'inherit', textDecoration: 'none' }} >
                                                {song.singer}
                                            </a>
                                        </StyledTableCell>
                                        <StyledTableCell align="right" sx={{
                                            paddingRight: '8px', width: '45%',
                                            whiteSpace: 'nowrap'
                                        }}
                                            style={{ paddingLeft: '40px', paddingRight: '8px' }}>
                                            <AddOutlinedIcon sx={CRUDIcon} onClick={() => onAddOneFromFav([song])} />
                                            <AddBoxOutlinedIcon sx={CRUDIcon} onClick={() => handleAddToFavClick(currentFavList.info.id, song)} />
                                            <DeleteOutlineOutlinedIcon sx={CRUDIcon} onClick={() => handleDelteFromSearchList(currentFavList.info.id, index)} />
                                        </StyledTableCell>
                                    </StyledTableRow>
                                )}
                            </TableBody>
                            <TableFooter>
                                <TableRow>
                                    <ThemeProvider theme={theme}>
                                        <TablePagination
                                            rowsPerPageOptions={[25, 75, 100]}
                                            colSpan={3}
                                            count={rows.length}
                                            rowsPerPage={rowsPerPage}
                                            page={page}
                                            SelectProps={{
                                                inputProps: {
                                                    'aria-label': 'rows per page',
                                                },
                                                native: true,
                                            }}
                                            onPageChange={handleChangePage}
                                            onRowsPerPageChange={handleChangeRowsPerPage}
                                            ActionsComponent={TablePaginationActions}
                                        />
                                    </ThemeProvider>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </TableContainer >
                </React.Fragment>
            }
        </React.Fragment>
    );
})
