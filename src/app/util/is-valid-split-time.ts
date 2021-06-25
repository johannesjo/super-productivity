export const isValidSplitTime = (v: string | undefined): boolean => {
  if (v && v.split) {
    const split = v.split(':');
    return (
      split.length === 2 &&
      !isNaN(+split[0]) &&
      !isNaN(+split[1]) &&
      +split[0] >= 0 &&
      +split[0] <= 24 &&
      +split[1] >= 0 &&
      +split[1] <= 59
    );
  }
  return false;
};
