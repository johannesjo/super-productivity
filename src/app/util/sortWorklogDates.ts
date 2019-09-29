export const sortWorklogDates = (dIN: string[]): string[] => {
  const d = dIN.slice();
  return d.sort((a, b) => {
    a = a.split('-').reverse().join('');
    b = b.split('-').reverse().join('');
    return a.localeCompare(b);
  });
};
