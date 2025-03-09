// export const WORKLOG_DATE_STR_FORMAT = 'YYYY-MM-DD';

// YYYY-MM-DD is the format we use
export const getWorklogStr = (date: Date | number | string = new Date()): string => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const isWorklogStr = (str: string): boolean => {
  return /^\d{4}-\d{2}-\d{2}$/.test(str);
};
