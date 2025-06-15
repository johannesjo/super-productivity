import { moveItemInArray } from './move-item-in-array';

export const moveItemBeforeItem = <T = string>(arr: T[], fromVal: T, toVal: T): T[] => {
  const toIndex = arr.indexOf(toVal);
  const fromIndex = arr.indexOf(fromVal);

  if (fromIndex === -1) {
    if (arr.length === 0) {
      return [fromVal];
    }
    return insertItemIntoArray(arr, fromVal, toIndex);
  }
  if (toIndex === -1) {
    if (arr.length === 0) {
      return [fromVal];
    }
    return insertItemIntoArray(arr, fromVal, 0);
  }

  // When moving forward (from lower to higher index), we need to account for the shift
  // that happens when we remove the item from its original position
  const adjustedToIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
  return moveItemInArray(arr, fromIndex, adjustedToIndex);
};

const insertItemIntoArray = <T = string>(arr: T[], fromVal: T, toIndex: number): T[] => {
  const array = [...arr];
  array.splice(toIndex, 0, fromVal);
  return array;
};
