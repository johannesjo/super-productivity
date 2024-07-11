import { clamp } from './clamp';

export const moveItemInArray = <T = string>(
  arr: T[],
  fromIndex: number,
  toIndex: number,
): T[] => {
  const from = clamp(fromIndex, arr.length - 1);
  const to = clamp(toIndex, arr.length - 1);
  if (from === to) {
    return arr;
  }

  const array = [...arr];

  const target = array[from];
  const delta = to < from ? -1 : 1;

  for (let i = from; i !== to; i += delta) {
    array[i] = array[i + delta];
  }

  array[to] = target;
  return array;
};
