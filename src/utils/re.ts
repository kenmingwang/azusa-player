import { extractSongName } from './Data';

const cleanup = (name: string) => {
  let value = String(name || '').trim();
  const artistTitle = value.match(/^.+?\s-\s(.+)$/);
  if (artistTitle?.[1]) {
    value = artistTitle[1];
  }
  value = value.replace(/[【\[].+?[】\]]/g, '');
  value = value.replace(/\(.*?\)|（.*?）/g, '');
  value = value.replace(/^\d+[._\-\s]*/, '');
  return value.trim();
};

export const reExtractSongName = (filename: string, uploader = ''): string => {
  const source = String(filename || '');
  const uploaderName = String(uploader || '').trim();

  const direct = cleanup(source);
  if (direct) return direct;

  if (uploaderName && source.includes(uploaderName)) {
    const removedUploader = cleanup(source.replaceAll(uploaderName, ''));
    if (removedUploader) return removedUploader;
  }

  return extractSongName(source);
};

export const getName = (song: { parsedName?: string; name: string }, parsed = false): string => {
  return parsed ? song.parsedName || song.name : song.name;
};

export const parseSongName = (song: { name: string; singer?: string; parsedName?: string }) => {
  song.parsedName = reExtractSongName(song.name, song.singer || '');
};

