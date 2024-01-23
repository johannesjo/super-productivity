export const isValidUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    return ['https:', 'http:'].includes(parsedUrl.protocol) && !!parsedUrl.hostname;
  } catch (e) {
    return false;
  }
};
