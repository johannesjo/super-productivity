/// <reference lib="webworker" />
import * as LZString from 'lz-string/libs/lz-string';

function handleData(msgData) {
  switch (msgData.type) {
    case 'COMPRESS':
      return LZString.compress(msgData.strToHandle);
    case 'DECOMPRESS':
      return LZString.decompress(msgData.strToHandle);
    case 'COMPRESS_UTF16':
      return LZString.compressToUTF16(msgData.strToHandle);
    case 'DECOMPRESS_UTF16':
      return LZString.decompressFromUTF16(msgData.strToHandle);
  }
}

addEventListener('message', ({data}) => {
  try {
    const strToHandle = handleData(data);
    postMessage({
      id: data.id,
      strToHandle: strToHandle,
    });
  } catch (err) {
    console.log(err);
    postMessage({
      id: data.id,
      err: err,
    });
  }
});
