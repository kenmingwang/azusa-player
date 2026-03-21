import * as React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';

interface AlertDialogProps {
  id?: string;
  onClose: (value?: string) => void;
  openState: boolean;
  value?: string;
  title?: string;
}

export const AlertDialog = function ({ onClose, openState, value, title = '确认删除歌单吗？' }: AlertDialogProps) {
  const handleCancel = () => onClose();
  const handleOK = () => onClose(value);

  return (
    <Dialog open={openState} onClose={handleCancel}>
      <DialogTitle>{title}</DialogTitle>
      <DialogActions>
        <Button onClick={handleCancel}>取消</Button>
        <Button onClick={handleOK} autoFocus>
          确认
        </Button>
      </DialogActions>
    </Dialog>
  );
};

