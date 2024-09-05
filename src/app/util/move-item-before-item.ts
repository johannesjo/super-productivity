import { moveItemInArray } from './move-item-in-array';

export const moveItemBeforeItem = <T = string>(arr: T[], fromVal: T, toVal: T): T[] => {
  const toIndex = arr.indexOf(toVal);
  const fromIndex = arr.indexOf(fromVal);
  return moveItemInArray(arr, fromIndex, toIndex);
};
