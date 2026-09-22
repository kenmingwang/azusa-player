import React, { useEffect, useState } from 'react';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import {
  audioQualityKey,
  getCachedAudioQuality,
  requestAudioQuality,
  subscribeAudioQuality,
  type AudioQualityInfo,
} from '../utils/audioQuality';

interface UseAudioQualityResult {
  info?: AudioQualityInfo;
  loading: boolean;
}

/** Resolves (and memoises) the best available audio quality of a video page. */
export const useAudioQuality = (bvid?: string, cid?: string): UseAudioQualityResult => {
  const key = audioQualityKey(bvid, cid);
  const [info, setInfo] = useState<AudioQualityInfo | undefined>(() => getCachedAudioQuality(bvid, cid));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!key) {
      setInfo(undefined);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    const cached = getCachedAudioQuality(bvid, cid);
    setInfo(cached);
    setLoading(!cached);

    const unsubscribe = subscribeAudioQuality((changedKey, changedInfo) => {
      if (cancelled || changedKey !== key) return;
      setInfo(changedInfo);
      setLoading(false);
    });

    requestAudioQuality(bvid, cid)
      .then((resolved) => {
        if (cancelled) return;
        setInfo(resolved);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [key, bvid, cid]);

  return { info, loading };
};

interface AudioQualityBadgeProps {
  bvid?: string;
  cid?: string;
}

/** Compact quality chip used by playlist / search result rows. */
export const AudioQualityBadge = function ({ bvid, cid }: AudioQualityBadgeProps) {
  const { info, loading } = useAudioQuality(bvid, cid);

  if (!bvid || !cid) {
    return <span data-testid='audio-quality-empty'>-</span>;
  }

  if (!info) {
    if (loading) {
      return <CircularProgress data-testid='audio-quality-loading' size={12} color='secondary' />;
    }
    return (
      <Tooltip title='无法解析该分 P 的音质'>
        <span data-testid='audio-quality-unknown'>-</span>
      </Tooltip>
    );
  }

  const detail = [
    info.title,
    info.codecs ? `编码 ${info.codecs}` : '',
    info.bandwidth ? `${Math.round(info.bandwidth / 1000)} kbps` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Tooltip title={detail}>
      <span
        data-testid='audio-quality'
        data-quality-id={info.qualityId}
        data-quality-label={info.label}
        style={{
          display: 'inline-block',
          padding: '0 6px',
          borderRadius: 8,
          fontSize: 12,
          lineHeight: '18px',
          color: '#ffffff',
          backgroundColor: info.qualityId >= 30250 ? '#c2185b' : info.qualityId >= 30280 ? '#7b1fa2' : '#9e9e9e',
        }}
      >
        {info.label}
      </span>
    </Tooltip>
  );
};
