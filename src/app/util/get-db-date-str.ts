//  'YYYY-MM-DD';

/*
⚠️ **Caution**: When parsing UTC ISO strings or timestamps from other timezones, the
 function will return the date in the **local timezone**, which may differ from the
  original date in the source timezone.
 */

export const getDbDateStr = (date: Date | number | string = new Date()): string => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const isDBDateStr = (str: string): boolean => {
  return /^\d{4}-\d{2}-\d{2}$/.test(str);
};
