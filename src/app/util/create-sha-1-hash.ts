export const createSha1Hash = (str: string): Promise<string> => {
  console.time('createSha1Hash');
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(str);
  return crypto.subtle.digest('SHA-1', dataBuffer).then((hash) => {
    const hashArray = Array.from(new Uint8Array(hash));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    console.timeEnd('createSha1Hash');
    return hashHex;
  });
};
