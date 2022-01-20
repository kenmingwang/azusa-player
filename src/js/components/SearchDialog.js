import * as React from "react";
import PropTypes from "prop-types";
import Button from "@mui/material/Button";
import { styled } from "@mui/material/styles";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import { DataGrid } from "@mui/x-data-grid";
import { ScrollBar } from "../styles/styles";

const BootstrapDialog = styled(Dialog)(({ theme }) => ({
    "& .MuiDialog-paper": {
        width: "1200px"
    },
    "& .MuiDialogContent-root": {
        padding: theme.spacing(2)
    },
    "& .MuiDialogActions-root": {
        padding: theme.spacing(1)
    },
    "& .MuiPaper-root": {
        maxHeight:'100%',
        top:'-80px',
        height: '74vh',
        overflow: 'auto'
    }
}));


export const SearchDialog = function ({ open }) {

    const handleClickOpen = () => {
        setOpen(true);
    };
    const handleClose = () => {
        setOpen(false);
    };

    return (
        <div                 className={ScrollBar().root}>
            <BootstrapDialog
                onClose={handleClose}
                aria-labelledby="customized-dialog-title"
                open={open}
            >
                <DialogContent >
                    <MediaCard />
                </DialogContent>
                <DialogActions>
                    <Button autoFocus onClick={handleClose}>
                        Play all
                    </Button>
                    <Button autoFocus onClick={handleClose}>
                        Add to List
                    </Button>
                    <Button autoFocus onClick={handleClose}>
                        Add to Fav
                    </Button>
                </DialogActions>
            </BootstrapDialog>
        </div>
    );
}

export function MediaCard() {
    return (
        <Card sx={{ maxWidth: 1000 }}>
            <CardMedia
                component="img"
                height="140"
                image="/static/images/cards/contemplative-reptile.jpg"
                alt="green iguana"
            />
            <CardContent>
                <DataTable />
            </CardContent>
        </Card>
    );
}

const columns = [
    { field: "id", headerName: "ID", width: 400 },
];

const rows = [
    { id: 1, lastName: "Snow", firstName: "Jon", },
    { id: 2, lastName: "Lannister", firstName: "Cersei", },
    { id: 3, lastName: "Lannister", firstName: "Jaime", },
    { id: 4, lastName: "Stark", firstName: "Arya", },
    { id: 5, lastName: "Targaryen", firstName: "Daenerys", },
    { id: 6, lastName: "Melisandre", firstName: null, },
    { id: 7, lastName: "Clifford", firstName: "Ferrara", },
    { id: 8, lastName: "Frances", firstName: "Rossini", },
    { id: 9, lastName: "Roxie", firstName: "Harvey", }
];

export function DataTable() {
    return (
        <div style={{ height: 400 }}>
            <DataGrid
                rows={rows}
                columns={columns}
                pageSize={10}
                rowsPerPageOptions={[5]}
                checkboxSelection
            />
        </div>
    );
}
