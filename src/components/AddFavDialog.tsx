import React, { useMemo, useState } from 'react';
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

interface NewFavDialogProps {
  id?: string;
  onClose: (value?: string) => void;
  openState: boolean;
  defaultValue?: string;
}

export const NewFavDialog = function ({ onClose, openState, defaultValue = '' }: NewFavDialogProps) {
  const [favName, setFavName] = useState(defaultValue);

  const handleCancel = () => {
    onClose();
    setFavName('');
  };

  const handleOK = () => {
    const trimmed = favName.trim();
    if (!trimmed) return;
    onClose(trimmed);
    setFavName('');
  };

  return (
    <Dialog open={openState} onClose={handleCancel} fullWidth maxWidth='xs'>
      <DialogTitle>{defaultValue ? '重命名歌单' : '新建歌单'}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin='dense'
          id='fav-name'
          label='歌单名称'
          fullWidth
          variant='standard'
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFavName(e.target.value)}
          value={favName}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') handleOK();
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>取消</Button>
        <Button disabled={!favName.trim()} onClick={handleOK}>
          确认
        </Button>
      </DialogActions>
    </Dialog>
  );
};

interface FavInfo {
  id: string;
  title: string;
}

interface AddFavDialogProps {
  id?: string;
  onClose: (fromId?: string | null, toId?: string, songs?: any[]) => void;
  openState: boolean;
  fromId?: string | null;
  favLists: FavInfo[];
  songs: any[];
}

export const AddFavDialog = function ({ onClose, openState, fromId, favLists, songs }: AddFavDialogProps) {
  const [favId, setFavId] = useState('');
  const menuProps = {
    PaperProps: {
      style: {
        maxHeight: 320,
      },
    },
  };

  const availableFavs = useMemo(() => (favLists || []).filter((v) => v.id !== fromId), [favLists, fromId]);

  const handleCancel = () => {
    onClose();
    setFavId('');
  };

  const handleOK = () => {
    onClose(fromId, favId, songs);
    setFavId('');
  };

  return (
    <Dialog open={openState} onClose={handleCancel} fullWidth maxWidth='sm'>
      <DialogTitle>添加到歌单</DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Box sx={{ minWidth: 320 }}>
          <FormControl fullWidth>
            <InputLabel id='fav-select-label'>目标歌单</InputLabel>
            <Select
              labelId='fav-select-label'
              id='fav-select'
              value={favId}
              label='目标歌单'
              onChange={(e) => setFavId(String(e.target.value))}
              MenuProps={menuProps}
            >
              {availableFavs.map((v) => (
                <MenuItem key={v.id} value={v.id}>
                  {v.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>取消</Button>
        <Button disabled={!favId} onClick={handleOK}>
          确认
        </Button>
      </DialogActions>
    </Dialog>
  );
};

interface HelpDialogProps {
  id?: string;
  onClose: () => void;
  openState: boolean;
}

export const HelpDialog = function ({ onClose, openState }: HelpDialogProps) {
  return (
    <Dialog open={openState} onClose={onClose} fullWidth maxWidth='md'>
      <DialogTitle>搜索说明</DialogTitle>
      <DialogContent>
        <DialogContentText>目前支持以下输入：</DialogContentText>
        <DialogContentText>- BVID: `BV1wr4y1v7TA`</DialogContentText>
        <DialogContentText>- 收藏夹 ID: `1793186881`</DialogContentText>
        <DialogContentText>
          - Collection / Season 链接: `https://space.bilibili.com/&lt;uid&gt;/lists/&lt;sid&gt;?type=season`
        </DialogContentText>
        <DialogContentText>
          - Series 链接: `https://space.bilibili.com/&lt;uid&gt;/lists/&lt;sid&gt;?type=series`
        </DialogContentText>
        <DialogContentText>
          - Season 链接: `https://space.bilibili.com/&lt;uid&gt;/lists/&lt;sid&gt;?type=season`
        </DialogContentText>
        <DialogContentText>右键 B 站视频、收藏夹、合集、series、season 链接也可以快速加入歌单。</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
};

