import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import React, { useState } from 'react';
import { getSongList, getFavList, getBiliSeriesList, getBiliColleList, SearchSource } from '../background/DataProcess';
import CircularProgress from '@mui/material/CircularProgress';

const SEARCH_ID = 'FavList-Search';

interface SearchResult {
  songList: any[];
  info: { title: string; id: string; source?: SearchSource };
}

interface SearchProps {
  handleSeach: (result: SearchResult) => void;
}

export const Search = function ({ handleSeach }: SearchProps) {
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(false);

  const buildResult = (title: string, songs: any[], source?: SearchSource): SearchResult => ({
    songList: songs,
    info: { title, id: SEARCH_ID, source },
  });

  const parseSpaceBilibiliSource = (
    input: string,
  ): { type: 'series' | 'collection'; mid: string; sid: string } | undefined => {
    try {
      const url = new URL(input);
      if (url.hostname !== 'space.bilibili.com') return undefined;

      const pathParts = url.pathname.split('/').filter(Boolean);
      const mid = pathParts[0];
      if (!/^\d+$/.test(mid)) return undefined;

      if (pathParts[1] === 'lists' && /^\d+$/.test(pathParts[2] || '')) {
        const sid = pathParts[2];
        const listType = url.searchParams.get('type');
        if (listType === 'series') return { type: 'series', mid, sid };
        if (listType === 'season') return { type: 'collection', mid, sid };
      }

      if (pathParts[1] === 'channel' && pathParts[2] === 'seriesdetail') {
        const sid = url.searchParams.get('sid');
        if (sid && /^\d+$/.test(sid)) return { type: 'series', mid, sid };
      }

      if (pathParts[1] === 'channel' && pathParts[2] === 'collectiondetail') {
        const sid = url.searchParams.get('sid');
        if (sid && /^\d+$/.test(sid)) return { type: 'collection', mid, sid };
      }
    } catch {
      return undefined;
    }

    return undefined;
  };

  const runSearch = async (input: string) => {
    setLoading(true);
    try {
      const biliSource = parseSpaceBilibiliSource(input);
      if (biliSource?.type === 'series') {
        const songs = await getBiliSeriesList(biliSource.mid, biliSource.sid);
        handleSeach(
          buildResult(`\u641c\u7d22\u5408\u96c6 - \u7528\u6237${biliSource.mid} / ${biliSource.sid}`, songs, biliSource),
        );
        return;
      }

      if (biliSource?.type === 'collection') {
        const songs = await getBiliColleList(biliSource.mid, biliSource.sid);
        handleSeach(
          buildResult(`\u641c\u7d22\u5408\u96c6 - \u7528\u6237${biliSource.mid} / ${biliSource.sid}`, songs, biliSource),
        );
        return;
      }

      if (input.startsWith('BV')) {
        const songs = await getSongList(input);
        handleSeach(buildResult(`\u641c\u7d22\u6b4c\u5355 - ${input}`, songs, { type: 'bvid', bvid: input }));
        return;
      }

      if (!/^\d+$/.test(input)) {
        handleSeach(buildResult(`\u65e0\u6cd5\u8bc6\u522b\u7684\u641c\u7d22\u8f93\u5165 - ${input}`, []));
        return;
      }

      const songs = await getFavList(input);
      handleSeach(buildResult(`\u641c\u7d22\u6b4c\u5355 - ${input}`, songs, { type: 'fav', mid: input }));
    } catch (error) {
      console.error(error);
      handleSeach(buildResult(`\u641c\u7d22\u5931\u8d25 - ${input}`, []));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ gridArea: 'search', minWidth: 0, display: 'flex', alignItems: 'center' }}>
      <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 1 }}>
        <TextField
          id='search-input'
          color='secondary'
          size='small'
          fullWidth
          label={'BVid / \u6536\u85cf\u5939ID / \u5408\u96c6\u94fe\u63a5'}
          placeholder='BV1w44y1b7MX / 1303535681'
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const input = searchValue.trim();
              if (input) {
                runSearch(input);
              }
            }
          }}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchValue(e.target.value)}
          value={searchValue}
        />
        {loading ? <CircularProgress size={22} /> : null}
      </Box>
    </Box>
  );
};
