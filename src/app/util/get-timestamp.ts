export const getTimestamp = (dateStr: string): number => {
  const date = new Date(dateStr);
  return date.getTime();
};
