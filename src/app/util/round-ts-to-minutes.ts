export const roundTsToMinutes = (timestamp: number): number => {
  // Convert timestamp to minutes, round it, and convert back to milliseconds
  return Math.round(timestamp / 60000) * 60000;
};
