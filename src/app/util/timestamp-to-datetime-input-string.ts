export const timestampToDatetimeInputString = (timestamp: number): string => {
  const date = new Date(timestamp + _getTimeZoneOffsetInMs());
  return date.toISOString().slice(0, 19);
};

const _getTimeZoneOffsetInMs = (): number => {
  return new Date().getTimezoneOffset() * -60 * 1000;
};
