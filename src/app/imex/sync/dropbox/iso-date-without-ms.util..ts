export const isoDateWithoutMs = (timestamp: number): string => {
  const d = new Date(timestamp);
  d.setSeconds(0, 0);
  return d.toISOString();
};

export const toDropboxIsoString = (timestamp: number): string => {
  return new Date(timestamp).toISOString().split('.')[0] + 'Z';
};
