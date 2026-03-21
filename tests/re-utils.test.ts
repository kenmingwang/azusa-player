import { describe, it, expect } from 'vitest';
import { reExtractSongName } from '../src/utils/re';

describe('reExtractSongName', () => {
  it('removes bracket and numeric prefix', () => {
    expect(reExtractSongName('【歌切】01. 星の在り処 (Live Ver)')).toBe('星の在り処');
  });

  it('removes uploader name if present', () => {
    expect(reExtractSongName('Aimer - brave shine', 'Aimer')).toBe('brave shine');
  });
});
