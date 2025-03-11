/// <reference lib="webworker" />
import LZString from 'lz-string';
import { compressSync, decompressSync, strFromU8, strToU8 } from 'fflate';

const handleData = (msgData: any): string | null => {
  switch (msgData.type) {
    case 'COMPRESS':
      return strFromU8(compressSync(strToU8(msgData.strToHandle)), true);
    case 'DECOMPRESS':
      const decompressed = decompressSync(strToU8(msgData.strToHandle, true));
      return strFromU8(decompressed);
    case 'COMPRESS_UTF16':
      // eslint-disable-next-line
      return LZString['compressToUTF16'](msgData.strToHandle);
    case 'DECOMPRESS_UTF16':
      // eslint-disable-next-line
      return LZString['decompressFromUTF16'](msgData.strToHandle);
    default:
      throw new Error('Invalid type');
  }
};

addEventListener('message', ({ data }) => {
  try {
    const strToHandle = handleData(data);
    postMessage({
      id: data.id,
      strToHandle,
    });
  } catch (err) {
    console.log(err);
    postMessage({
      id: data.id,
      err,
    });
  }
});
