import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import React, { useState } from 'react';
import { getSongList, getFavList, getBiliSeriesList, getBiliColleList } from '../background/DataProcess';
import CircularProgress from '@mui/material/CircularProgress';

const SEARCH_ID = 'FavList-Search';

interface SearchResult {
  songList: any[];
  info: { title: string; id: string };
}

interface SearchProps {
  handleSeach: (result: SearchResult) => void;
}

export const Search = function ({ handleSeach }: SearchProps) {
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(false);

  const buildResult = (title: string, songs: any[]): SearchResult => ({
    songList: songs,
    info: { title, id: SEARCH_ID },
  });

  const runSearch = async (input: string) => {
    setLoading(true);
    try {
      let m = /.*\.com\/(\d+)\/channel\/seriesdetail\?sid=(\d+).*/.exec(input);
      if (m) {
        const songs = await getBiliSeriesList(m[1], m[2]);
        handleSeach(buildResult(`搜索合集 - 用户${m[1]} / ${m[2]}`, songs));
        return;
      }

      m = /.*\.com\/(\d+)\/channel\/collectiondetail\?sid=(\d+).*/.exec(input);
      if (m) {
        const songs = await getBiliColleList(m[1], m[2]);
        handleSeach(buildResult(`搜索合集 - 用户${m[1]} / ${m[2]}`, songs));
        return;
      }

      m = /.*\.com\/(\d+)\/lists\/(\d+)\?type=season.*/.exec(input);
      if (m) {
        const songs = await getBiliColleList(m[1], m[2]);
        handleSeach(buildResult(`搜索 season - 用户${m[1]} / ${m[2]}`, songs));
        return;
      }

      if (input.startsWith('BV')) {
        const songs = await getSongList(input);
        handleSeach(buildResult(`搜索歌单 - ${input}`, songs));
        return;
      }

      const songs = await getFavList(input);
      handleSeach(buildResult(`搜索歌单 - ${input}`, songs));
    } catch (error) {
      console.error(error);
      handleSeach(buildResult(`搜索失败 - ${input}`, []));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ gridArea: 'search' }} style={{ paddingTop: '12px' }}>
      <Box sx={{ mx: 'auto', textAlign: 'center' }}>
        <TextField
          id='search-input'
          color='secondary'
          label='BVid / 收藏夹ID / 合集链接'
          placeholder='BV1w44y1b7MX / 1303535681'
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
              const input = String((e.currentTarget as HTMLInputElement).value || '').trim();
              if (input) runSearch(input);
            }
          }}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchValue(e.target.value)}
          value={searchValue}
        />
        {loading ? <CircularProgress sx={{ pl: 2, pr: 2 }} /> : null}
      </Box>
    </Box>
  );
};
