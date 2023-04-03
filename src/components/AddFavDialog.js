import React, { useState } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import Box from '@mui/material/Box';

export const NewFavDialog = function ({ onClose, openState }) {
  const [favName, setfavName] = useState('')

  const handleCancel = () => {
    onClose()
    setfavName('')
  }

  const onfavName = (e) => {
    setfavName(e.target.value)
  }

  const handleOK = () => {
    onClose(favName)
    setfavName('')
  }

  return (
    <div>
      <Dialog open={openState}>
        <DialogTitle>新建歌单</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin='dense'
            id='name'
            label='歌单名字'
            type='name'
            variant='standard'
            onChange={onfavName}
            value={favName}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel}>取消</Button>
          {favName == '' ? (
            <Button disabled>确认</Button>
          ) : (
            <Button onClick={handleOK}>确认</Button>
          )}
        </DialogActions>
      </Dialog>
    </div>
  );
};

export const AddFavDialog = function ({
  onClose,
  openState,
  fromId,
  favLists,
  song,
}) {
  const [favId, setfavId] = useState('');

  const handleCancel = () => {
    onClose();
    setfavId('');
  };

  const onfavId = (e) => {
    setfavId(e.target.value);
  };

  const handleOK = () => {
    onClose(fromId, favId, song);
    setfavId('');
  };

  return (
    <div>
      <Dialog open={openState}>
        <DialogTitle>添加到歌单</DialogTitle>
        <DialogContent style={{ paddingTop: '24px' }}>
          <Box sx={{ minWidth: 400, minHeight: 50 }}>
            <FormControl fullWidth>
              <InputLabel id='demo-simple-select-label'>添加到歌单</InputLabel>
              <Select
                labelId='demo-simple-select-label'
                id='demo-simple-select'
                value={favId}
                label='FavLists'
                onChange={onfavId}
              >
                {favLists &&
                  favLists.map((v, i) => {
                    if (v.id != fromId)
                      return (
                        <MenuItem key={i} value={v.id}>
                          {v.title}
                        </MenuItem>
                      );
                  })}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel}>取消</Button>
          {favId == '' ? (
            <Button disabled>确认</Button>
          ) : (
            <Button onClick={handleOK}>确认</Button>
          )}
        </DialogActions>
      </Dialog>
    </div>
  );
};

export const HelpDialog = function ({ onClose, openState }) {
  const handleCancel = () => {
    onClose();
  };

  return (
    <div>
      <Dialog open={openState}>
        <DialogTitle>帮助</DialogTitle>
        <DialogContent>
          <DialogContentText id='alert-dialog-description'>
            搜索目前支持以下四种:
          </DialogContentText>
          <DialogContentText>
            - BVID: 视频的BVID(ex.BV1wr4y1v7TA)
          </DialogContentText>
          <DialogContentText>
            - FIV: 收藏夹的ID,需开放(ex.1793186881)
          </DialogContentText>
          <DialogContentText>
            - Collection:合集,需整个url放入搜索框(ex.https://space.bilibili.com/1982780/channel/collectiondetail?sid=93172)
          </DialogContentText>
          <DialogContentText>
            - Series:合集,需整个url放入搜索框(https://space.bilibili.com/5053504/channel/seriesdetail?sid=2440602)
          </DialogContentText>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCancel}>取消</Button>
          <Button disabled>确认</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
