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
        handleSeach(buildResult(`\u641c\u7d22\u5408\u96c6 - \u7528\u6237${m[1]} / ${m[2]}`, songs));
        return;
      }

      m = /.*\.com\/(\d+)\/channel\/collectiondetail\?sid=(\d+).*/.exec(input);
      if (m) {
        const songs = await getBiliColleList(m[1], m[2]);
        handleSeach(buildResult(`\u641c\u7d22\u5408\u96c6 - \u7528\u6237${m[1]} / ${m[2]}`, songs));
        return;
      }

      m = /.*\.com\/(\d+)\/lists\/(\d+)\?type=season.*/.exec(input);
      if (m) {
        const songs = await getBiliColleList(m[1], m[2]);
        handleSeach(buildResult(`\u641c\u7d22 season - \u7528\u6237${m[1]} / ${m[2]}`, songs));
        return;
      }

      if (input.startsWith('BV')) {
        const songs = await getSongList(input);
        handleSeach(buildResult(`\u641c\u7d22\u6b4c\u5355 - ${input}`, songs));
        return;
      }

      const songs = await getFavList(input);
      handleSeach(buildResult(`\u641c\u7d22\u6b4c\u5355 - ${input}`, songs));
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
