const DEFAULT_SNACK_TITLE_LENGTH = 40;

export const truncate = (str: string, maxLength = DEFAULT_SNACK_TITLE_LENGTH): string => {
  if (str && str.length > maxLength) {
    return str.substring(0, maxLength - 1) + '…';
  }
  return str;
};
