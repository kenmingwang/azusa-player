import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  collectAudioStreams,
  describeAudioQuality,
  describeAudioStream,
  getAudioFileExtension,
  pickBestAudioStream,
} from '../src/utils/Data';

const mockJsonResponse = (payload: any) => ({
  json: vi.fn().mockResolvedValue(payload),
  text: vi.fn().mockResolvedValue(JSON.stringify(payload)),
  headers: { get: vi.fn(() => 'application/json; charset=utf-8') },
  ok: true,
  status: 200,
});

const dashResponse = (dash: Record<string, any>) => mockJsonResponse({ code: 0, data: { dash } });

const aac = (id: number, bandwidth: number, url = `url-${id}`) => ({
  id,
  bandwidth,
  codecs: 'mp4a.40.2',
  mimeType: 'audio/mp4',
  baseUrl: url,
});

const loadFreshDataModule = async () => {
  vi.resetModules();
  return import('../src/utils/Data');
};

describe('audio quality metadata', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('collectAudioStreams', () => {
    it('merges the aac ladder with dolby and hi-res streams', () => {
      const streams = collectAudioStreams({
        data: {
          dash: {
            audio: [aac(30216, 67320), aac(30280, 319101)],
            dolby: { type: 1, audio: [{ id: 30250, bandwidth: 448000, codecs: 'ec-3', baseUrl: 'dolby-url' }] },
            flac: { display: true, audio: { id: 30251, bandwidth: 1411200, codecs: 'fLaC', baseUrl: 'flac-url' } },
          },
        },
      });

      expect(streams.map((stream) => stream.id)).toEqual([30216, 30280, 30250, 30251]);
    });

    it('ignores entries without a playable url and empty premium slots', () => {
      const streams = collectAudioStreams({
        data: {
          dash: {
            audio: [aac(30216, 67320, ''), aac(30232, 132796)],
            dolby: { type: 0, audio: undefined },
            flac: null,
          },
        },
      });

      expect(streams).toHaveLength(1);
      expect(streams[0].id).toBe(30232);
    });

    it('returns an empty list when dash is missing', () => {
      expect(collectAudioStreams({ data: {} })).toEqual([]);
      expect(collectAudioStreams(undefined)).toEqual([]);
    });
  });

  describe('pickBestAudioStream', () => {
    it('prefers the 192K stream over 132K and 64K', () => {
      const best = pickBestAudioStream([aac(30216, 67320), aac(30232, 132796), aac(30280, 319101)]);
      expect(best?.id).toBe(30280);
    });

    it('prefers hi-res (flac) then dolby over the aac ladder', () => {
      const flac = { id: 30251, bandwidth: 1411200, codecs: 'fLaC', mimeType: 'audio/flac', baseUrl: 'flac-url' };
      const dolby = { id: 30250, bandwidth: 448000, codecs: 'ec-3', mimeType: 'audio/eac3', baseUrl: 'dolby-url' };

      expect(pickBestAudioStream([aac(30280, 319101), flac])?.id).toBe(30251);
      expect(pickBestAudioStream([aac(30280, 319101), dolby])?.id).toBe(30250);
      expect(pickBestAudioStream([flac, dolby])?.id).toBe(30251);
    });

    it('honours an explicit quality preference', () => {
      const best = pickBestAudioStream([aac(30216, 67320), aac(30232, 132796), aac(30280, 319101)], 30232);
      expect(best?.id).toBe(30232);
    });

    it('falls back to the highest bandwidth when ids are unknown to bilibili', () => {
      const best = pickBestAudioStream([
        { id: 1, bandwidth: 100, codecs: 'aac', baseUrl: 'low-url' },
        { id: 2, bandwidth: 200, codecs: 'mp4a.40.2', baseUrl: 'high-url' },
      ]);
      expect(best?.baseUrl).toBe('high-url');
    });

    it('supports snake_case dash payloads', () => {
      const best = pickBestAudioStream([{ id: 30280, bandwidth: 319101, base_url: 'snake-url' }]);
      expect(best?.base_url).toBe('snake-url');
    });

    it('returns undefined when nothing is playable', () => {
      expect(pickBestAudioStream([])).toBeUndefined();
    });
  });

  describe('describeAudioStream', () => {
    it('labels the standard aac tiers', () => {
      expect(describeAudioQuality(aac(30280, 319101))).toEqual({ qualityId: 30280, label: '192K', title: '192K AAC' });
      expect(describeAudioQuality(aac(30216, 67320)).label).toBe('64K');
    });

    it('labels hi-res and dolby streams', () => {
      expect(describeAudioQuality({ id: 30251, bandwidth: 1411200 }).label).toBe('无损');
      expect(describeAudioQuality({ id: 30250, bandwidth: 448000 }).label).toBe('杜比');
    });

    it('derives the file extension from the container', () => {
      expect(getAudioFileExtension({ mimeType: 'audio/flac', codecs: 'fLaC' })).toBe('flac');
      expect(getAudioFileExtension({ mimeType: 'audio/eac3', codecs: 'ec-3' })).toBe('eac3');
      expect(getAudioFileExtension({ mimeType: 'audio/mp4', codecs: 'mp4a.40.2' })).toBe('m4a');
      expect(getAudioFileExtension({ codecs: 'aac' })).toBe('m4a');
      expect(getAudioFileExtension({})).toBe('m4a');
    });

    it('describes a full stream for the ui', () => {
      const described = describeAudioStream(aac(30280, 319101, 'play-url'));
      expect(described).toMatchObject({
        qualityId: 30280,
        label: '192K',
        title: '192K AAC',
        codecs: 'mp4a.40.2',
        bandwidth: 319101,
        mimeType: 'audio/mp4',
        extension: 'm4a',
        url: 'play-url',
      });
      expect(typeof described?.fetchedAt).toBe('number');
      expect(describeAudioStream(undefined)).toBeUndefined();
    });
  });

  describe('playurl request strategy', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('falls back to the legacy fnval request when the extended request yields no audio', async () => {
      const fetchMock = vi.fn(async (url: string) => {
        if (url.includes('fnval=16')) {
          return dashResponse({ audio: [aac(30216, 67320), aac(30280, 319101)] });
        }
        return mockJsonResponse({ code: 0, data: { dash: { audio: [] } } });
      });
      vi.stubGlobal('fetch', fetchMock);

      const { fetchBestAudio } = await loadFreshDataModule();
      const best = await fetchBestAudio('BV_X', 'CID_X');

      expect(best?.url).toBe('url-30280');
      expect(best?.label).toBe('192K');
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(fetchMock.mock.calls[0][0]).toContain('fnval=4048');
      expect(fetchMock.mock.calls[0][1]).toMatchObject({ credentials: 'include' });
      expect(fetchMock.mock.calls[2][0]).toContain('fnval=16');
    });

    it('sends the first (credentialed) request when the account exposes premium audio', async () => {
      const fetchMock = vi.fn(async () =>
        dashResponse({
          audio: [aac(30280, 319101)],
          flac: { display: true, audio: { id: 30251, bandwidth: 1411200, codecs: 'fLaC', mimeType: 'audio/flac', baseUrl: 'flac-url' } },
        }),
      );
      vi.stubGlobal('fetch', fetchMock);

      const { fetchBestAudio } = await loadFreshDataModule();
      const best = await fetchBestAudio('BV_X', 'CID_X');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][1]).toMatchObject({ credentials: 'include' });
      expect(best).toMatchObject({ qualityId: 30251, label: '无损', extension: 'flac', url: 'flac-url' });
    });

    it('rejects when every playurl variant fails', async () => {
      const fetchMock = vi.fn(async () => {
        throw new Error('network down');
      });
      vi.stubGlobal('fetch', fetchMock);

      const { fetchBestAudio } = await loadFreshDataModule();
      await expect(fetchBestAudio('BV_X', 'CID_X')).rejects.toThrow('network down');
    });
  });
});
