export const parseBvid = (input: string): string | null => {
  const trimmed = input.trim();
  const direct = trimmed.match(/BV[0-9A-Za-z]{10}/)?.[0];
  if (direct) return direct;

  const fromUrl = trimmed.match(/bilibili\.com\/video\/(BV[0-9A-Za-z]{10})/i)?.[1];
  return fromUrl ?? null;
};

export const parseFavMediaId = (input: string): string | null => {
  const byUrl = input.match(/[?&]fid=(\d+)/)?.[1] || input.match(/\/favlist\?fid=(\d+)/)?.[1];
  if (byUrl) return byUrl;

  if (/^\d+$/.test(input.trim())) return input.trim();
  return null;
};
