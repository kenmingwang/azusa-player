import React, { useState } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';


export const AddFavDialog = function ({ onClose, openState }) {
  const [favName, setfavName] = useState('')

  const handleCancel = () => {
    onClose()
  }

  const onfavName = (e) => {
    setfavName(e.target.value)
  }

  const handleOK = () => {
    onClose(favName)
  }

  return (
    <div>
      <Dialog open={openState}>
        <DialogTitle>新建歌单</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="歌单名字"
            type="name"
            variant="standard"
            onChange={onfavName}
            value={favName}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel}>取消</Button>
          {favName == '' ?
            <Button disabled>确认</Button> :
            <Button onClick={handleOK}>确认</Button>}

        </DialogActions>
      </Dialog>
    </div>
  );
}
