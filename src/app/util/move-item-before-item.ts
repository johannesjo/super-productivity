import { moveItemInArray } from './move-item-in-array';

export const moveItemBeforeItem = <T = string>(arr: T[], fromVal: T, toVal: T): T[] => {
  const toIndex = arr.indexOf(toVal);
  const fromIndex = arr.indexOf(fromVal);
  console.log(fromIndex, toIndex);

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

  return moveItemInArray(arr, fromIndex, toIndex);
};

const insertItemIntoArray = <T = string>(arr: T[], fromVal: T, toIndex: number): T[] => {
  const array = [...arr];
  array.splice(toIndex, 0, fromVal);
  return array;
};
