// borrowed
export const getTextFromArrayBuffer = (
  arrayBuffer: ArrayBuffer,
  encoding: string = 'UTF-8',
): Promise<string | ArrayBuffer> => {
  return new Promise((resolve /*, reject*/) => {
    if (typeof Blob === 'undefined') {
      const buffer = new Buffer(new Uint8Array(arrayBuffer));
      resolve(buffer.toString(encoding));
    } else {
      let blob;
      const gc = window as any;
      // TODO fix as BlobBuilder is not available in all browsers
      // @see https://developer.mozilla.org/en-US/docs/Web/API/BlobBuilder
      gc.BlobBuilder = gc.BlobBuilder || gc.WebKitBlobBuilder;
      if (typeof gc.BlobBuilder !== 'undefined') {
        const bb = new gc.BlobBuilder();
        bb.append(arrayBuffer);
        blob = bb.getBlob();
      } else {
        blob = new Blob([arrayBuffer]);
      }

      const fileReader = new FileReader();
      if (typeof fileReader.addEventListener === 'function') {
        fileReader.addEventListener('loadend', (evt) => {
          resolve(evt.target.result);
        });
      } else {
        fileReader.onloadend = (evt) => {
          resolve(evt.target.result);
        };
      }
      fileReader.readAsText(blob, encoding);
    }
  });
};
