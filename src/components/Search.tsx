import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import React, { useEffect, useRef, useState } from 'react';
import { getSongList, getFavList, getBiliSeriesList, getBiliColleList, type SearchSource } from '../background/DataProcess';
import CircularProgress from '@mui/material/CircularProgress';
import { parseSearchSource } from '../utils/searchSource';
import { VideoSearchDialog } from './VideoSearchDialog';
import type Song from '../objects/Song';

const SEARCH_ID = 'FavList-Search';

interface SearchResult {
  songList: any[];
  info: { title: string; id: string; source?: SearchSource };
}

interface SearchProps {
  handleSeach: (result: SearchResult) => void;
  onPlaySongs: (songs: Song[]) => void;
  onAddSongs: (songs: Song[]) => void;
}

export const Search = function ({ handleSeach, onPlaySongs, onAddSongs }: SearchProps) {
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [keywordSearch, setKeywordSearch] = useState<{ keyword: string; id: number } | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => () => { requestIdRef.current += 1; }, []);

  const runSearch = async (input: string) => {
    const requestId = ++requestIdRef.current;
    const source = /^\d+$/.test(input) ? { type: 'fav' as const, mid: input } : parseSearchSource(input);
    setKeywordSearch(null);
    if (!source && !/^https?:\/\//i.test(input)) {
      setLoading(false);
      setKeywordSearch({ keyword: input, id: requestId });
      return;
    }
    const showResult = (title: string, songs: any[], searchSource?: SearchSource) => {
      if (requestId !== requestIdRef.current) return;
      handleSeach({ songList: songs, info: { title, id: SEARCH_ID, source: searchSource } });
    };
    if (!source) {
      setLoading(false);
      showResult(`无法识别的搜索输入 - ${input}`, []);
      return;
    }
    setLoading(true);
    try {
      let songs: Song[];
      switch (source.type) {
        case 'bvid': songs = await getSongList(source.bvid); break;
        case 'fav': songs = await getFavList(source.mid); break;
        case 'series': songs = await getBiliSeriesList(source.mid, source.sid); break;
        case 'collection': songs = await getBiliColleList(source.mid, source.sid); break;
      }
      showResult(`搜索歌单 - ${input}`, songs, source);
    } catch (error) {
      console.error(error);
      showResult(`搜索失败 - ${input}`, []);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };

  return (
    <>
      <Box component='form' onSubmit={(event: React.FormEvent) => {
        event.preventDefault();
        const input = searchValue.trim();
        if (input) void runSearch(input);
      }} sx={{ gridArea: 'search', minWidth: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
        <TextField
          id='search-input'
          color='secondary'
          size='small'
          fullWidth
          label='歌名 / 歌手 / BVid / 收藏夹ID / 合集链接'
          placeholder='输入歌名或歌手，例如：周杰伦 晴天'
          onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault();
          }}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSearchValue(event.target.value)}
          value={searchValue}
        />
        <Button type='submit' variant='outlined' color='secondary' disabled={!searchValue.trim()} sx={{ flexShrink: 0 }}>搜索</Button>
        {loading && <CircularProgress size={22} />}
      </Box>
      {keywordSearch && <VideoSearchDialog key={keywordSearch.id} keyword={keywordSearch.keyword} onClose={() => setKeywordSearch(null)} onPlay={onPlaySongs} onAdd={onAddSongs} />}
    </>
  );
};
