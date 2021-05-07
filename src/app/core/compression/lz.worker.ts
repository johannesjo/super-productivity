/// <reference lib="webworker" />
import * as LZString from 'lz-string';

const handleData = (msgData: any) => {
  switch (msgData.type) {
    case 'COMPRESS':
      return LZString.compress(msgData.strToHandle);
    case 'DECOMPRESS':
      return LZString.decompress(msgData.strToHandle);
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
