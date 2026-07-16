export const extractDrizzleSqlParameters = (fragment: unknown): unknown[] => {
  if (!fragment || typeof fragment !== 'object') return [];
  const chunks = (fragment as { queryChunks?: unknown[] }).queryChunks;
  if (!Array.isArray(chunks)) return [];

  return chunks.flatMap((chunk) => {
    if (chunk && typeof chunk === 'object') {
      return extractDrizzleSqlParameters(chunk);
    }
    return [chunk];
  });
};
