export const getCacheId = (r: RequestInit, url: string): string => {
  return `${url}_${r.method}_${r.body ? r.body : ''}`;
};
