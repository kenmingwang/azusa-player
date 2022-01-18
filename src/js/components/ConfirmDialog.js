import * as React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';

export const AlertDialog = function ({ onClose, openState, value }) {

    const handleCancel = () => {
        onClose()
    }

    const handleOK = () => {
        onClose(value)
    }

    return (
        <div>
            <Dialog
                open={openState}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="alert-dialog-title">
                    确认删除歌单吗？
                </DialogTitle>
                <DialogActions>
                    <Button onClick={handleCancel}>取消</Button>
                    <Button onClick={handleOK} autoFocus>
                        确认
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}
