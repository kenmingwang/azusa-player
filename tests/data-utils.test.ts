import { describe, it, expect } from 'vitest';
import { extractSongName } from '../src/utils/Data';

describe('extractSongName', () => {
  it('extracts song name in Chinese book quotes', () => {
    expect(extractSongName('翻唱《夜に駆ける》live')).toBe('夜に駆ける');
  });

  it('returns original when no quoted title exists', () => {
    expect(extractSongName('Just A Song')).toBe('Just A Song');
  });
});
