export const sortWorklogDates = (dIN: string[]): string[] => {
  const d = dIN.slice();
  return d.sort((a, b) => {
    return a.localeCompare(b);
  });
};
