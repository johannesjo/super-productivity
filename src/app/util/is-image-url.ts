export function isImageUrlSimple(url: string): boolean {
  return (url.match(/\.(jpeg|jpg|gif|png)$/i) !== null);
}

export function isImageUrl(url: string): Promise<boolean> {
  return new Promise(resolve => {
    const timeout = 5000;
    const img = new Image();
    let timedOut = false;

    img.onerror = img.onabort = () => {
      if (!timedOut) {
        clearTimeout(timer);
        resolve(false);
      }
    };
    img.onload = () => {
      if (!timedOut) {
        clearTimeout(timer);
        resolve(true);
      }
    };
    img.src = url;
    const timer = setTimeout(() => {
      timedOut = true;
      // reset .src to invalid URL so it stops previous
      // loading, but doesn't trigger new load
      img.src = '//!!!!/test.jpg';
      resolve(false);
    }, timeout);
  });
}
