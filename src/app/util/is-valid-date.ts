export const isValidDate = (date: Date): boolean => {
  return date instanceof Date && !isNaN(date as any);
};
