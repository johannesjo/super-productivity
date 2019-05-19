export const sortStringDates = (d_: string[]): string[] => {
  const d = d_.slice();
  return d.sort(function (a, b) {
    a = a.split('/').reverse().join('');
    b = b.split('/').reverse().join('');
    return a.localeCompare(b);
  });
};
