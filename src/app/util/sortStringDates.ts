export const sortStringDates = (d_: string[]): string[] => {
  const d = d_.slice();
  return d.sort((a, b) => a.localeCompare(b));
};
