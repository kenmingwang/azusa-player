import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import FolderSharedIcon from '@mui/icons-material/FolderShared';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import {
  clearStoredDownloadDirectory,
  describeDownloadDirectory,
  isDirectoryPickerSupported,
  pickDownloadDirectory,
  verifyDirectoryPermission,
} from '../utils/fileSystemAccess';
import {
  clearDownloadHistory,
  readDownloadHistory,
  subscribeDownloadHistory,
  type DownloadRecord,
} from '../utils/downloadHistory';

export const BROWSER_DOWNLOAD_SUBFOLDER = 'azusa-player';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const formatBytes = (bytes?: number) => {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const formatTime = (timestamp: number) => new Date(timestamp).toLocaleString('zh-CN', { hour12: false });

const statusText: Record<DownloadRecord['status'], string> = {
  done: '已保存',
  failed: '失败',
  cancelled: '已取消',
};

const statusColor: Record<DownloadRecord['status'], 'success' | 'error' | 'default'> = {
  done: 'success',
  failed: 'error',
  cancelled: 'default',
};

const getDownloadsApi = () =>
  (globalThis as any)?.chrome?.downloads && typeof (globalThis as any).chrome.downloads.download === 'function'
    ? ((globalThis as any).chrome.downloads as typeof chrome.downloads)
    : undefined;

const DownloadDialog = ({ open, onClose }: Props) => {
  const [records, setRecords] = useState<DownloadRecord[]>([]);
  const [directoryName, setDirectoryName] = useState('');
  const [permission, setPermission] = useState<'granted' | 'prompt' | 'denied' | 'none'>('none');
  const [busy, setBusy] = useState(false);
  const downloadsSupported = !!getDownloadsApi();

  const refreshDirectory = useCallback(async () => {
    const { name, permission: state } = await describeDownloadDirectory();
    setDirectoryName(name);
    setPermission(state);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    readDownloadHistory().then((stored) => {
      if (alive) setRecords(stored);
    });
    refreshDirectory();
    const unsubscribe = subscribeDownloadHistory((next) => setRecords([...next]));
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [open, refreshDirectory]);

  const handlePickDirectory = async () => {
    setBusy(true);
    try {
      const handle = await pickDownloadDirectory();
      if (handle) {
        await refreshDirectory();
      }
    } catch (error) {
      // Dismissing the picker throws AbortError — nothing worth reporting.
      console.warn('[azusa-player][downloads] directory picker closed', error);
    } finally {
      setBusy(false);
    }
  };

  const handleGrant = async () => {
    const { handle } = await describeDownloadDirectory();
    if (!handle) return;
    setBusy(true);
    try {
      await verifyDirectoryPermission(handle, true);
      await refreshDirectory();
    } finally {
      setBusy(false);
    }
  };

  const handleClearDirectory = async () => {
    await clearStoredDownloadDirectory();
    await refreshDirectory();
  };

  const handleOpenFolder = () => {
    getDownloadsApi()?.showDefaultFolder?.();
  };

  const handleOpenRecord = (record: DownloadRecord) => {
    const downloads = getDownloadsApi();
    if (!downloads?.show || !record.downloadId) return;
    downloads.show(record.downloadId);
  };

  const handleClearHistory = async () => {
    setRecords(await clearDownloadHistory());
  };

  const locationLabel = directoryName
    ? `直接保存到所选文件夹：${directoryName}`
    : `保存到浏览器下载目录 · 子目录 ${BROWSER_DOWNLOAD_SUBFOLDER}/`;
  const needsGrant = !!directoryName && permission !== 'granted';

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='sm' data-testid='download-dialog'>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        下载与记录
        <Box sx={{ flexGrow: 1 }} />
        <IconButton size='small' edge='end' onClick={onClose} data-testid='close-download-dialog'>
          <CloseIcon fontSize='small' />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant='subtitle2' sx={{ mb: 1 }}>
          下载位置
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
          <FolderSharedIcon fontSize='small' color={directoryName ? 'primary' : 'disabled'} />
          <Typography variant='body2' data-testid='download-location' sx={{ flexGrow: 1, minWidth: 180 }}>
            {locationLabel}
          </Typography>
          {needsGrant && (
            <Button
              size='small'
              variant='outlined'
              color='warning'
              disabled={busy}
              onClick={handleGrant}
              data-testid='grant-download-directory'
            >
              重新授权
            </Button>
          )}
          {isDirectoryPickerSupported() && (
            <Button
              size='small'
              variant='outlined'
              disabled={busy}
              onClick={handlePickDirectory}
              data-testid='pick-download-directory'
            >
              {directoryName ? '更换文件夹' : '选择文件夹'}
            </Button>
          )}
          {directoryName && (
            <Button
              size='small'
              color='inherit'
              disabled={busy}
              onClick={handleClearDirectory}
              data-testid='clear-download-directory'
            >
              用默认目录
            </Button>
          )}
        </Box>
        <Typography variant='caption' color='text.secondary' display='block' sx={{ mb: 2 }} data-testid='download-location-hint'>
          选一次文件夹后即可静默保存，不再逐个弹「另存为」；没选文件夹时保存到浏览器下载目录（Chrome 扩展无法直接写入任意绝对路径，这是浏览器的安全限制）。
        </Typography>

        <Divider sx={{ mb: 1 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant='subtitle2' sx={{ flexGrow: 1 }}>
            下载记录 · {records.length}
          </Typography>
          {downloadsSupported && (
            <Tooltip title='打开下载目录'>
              <span>
                <IconButton size='small' onClick={handleOpenFolder} data-testid='open-download-folder'>
                  <FolderOpenIcon fontSize='small' />
                </IconButton>
              </span>
            </Tooltip>
          )}
          <Tooltip title='清空记录'>
            <span>
              <IconButton
                size='small'
                onClick={handleClearHistory}
                disabled={!records.length}
                data-testid='clear-download-history'
              >
                <DeleteOutlineIcon fontSize='small' />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        {records.length === 0 ? (
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ py: 3, textAlign: 'center' }}
            data-testid='download-history-empty'
          >
            还没有下载记录
          </Typography>
        ) : (
          <List dense data-testid='download-history-list' sx={{ maxHeight: 320, overflowY: 'auto' }}>
            {records.map((record) => (
              <ListItem
                key={record.id}
                data-testid='download-record'
                divider
                secondaryAction={
                  record.status === 'done' && record.downloadId && downloadsSupported ? (
                    <Tooltip title='在文件夹中显示'>
                      <IconButton
                        edge='end'
                        size='small'
                        onClick={() => handleOpenRecord(record)}
                        data-testid='show-download-record'
                      >
                        <InsertDriveFileOutlinedIcon fontSize='small' />
                      </IconButton>
                    </Tooltip>
                  ) : undefined
                }
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                      <Typography variant='body2' noWrap sx={{ maxWidth: 200 }}>
                        {record.name}
                      </Typography>
                      {record.qualityLabel && (
                        <Chip
                          size='small'
                          label={record.qualityLabel}
                          color='primary'
                          variant='outlined'
                          data-quality-label={record.qualityLabel}
                        />
                      )}
                      <Chip
                        size='small'
                        label={statusText[record.status] || record.status}
                        color={statusColor[record.status] || 'default'}
                        variant='outlined'
                      />
                    </Box>
                  }
                  secondary={
                    <Typography variant='caption' color='text.secondary' component='span'>
                      {[
                        record.fileName,
                        formatBytes(record.size),
                        record.target === 'directory' ? record.location : undefined,
                        formatTime(record.finishedAt),
                        record.error,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} data-testid='close-download-dialog-confirm'>
          关闭
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DownloadDialog;
