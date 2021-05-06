export const arrayMove = <T>(
  arrIN: T[],
  from: number,
  to: number,
  on: number = 1,
): T[] => {
  const arr = arrIN.slice(0);
  arr.splice(to, 0, ...arr.splice(from, on));
  return arr;
};

export const arrayMoveLeft = <T>(arr: T[], val: T): T[] => {
  if (!arr.includes(val)) {
    return arr;
  }

  const oldIndex = arr.indexOf(val);
  const newIndex = oldIndex - 1;

  if (newIndex >= 0) {
    return arrayMove(arr, oldIndex, newIndex);
  }
  return arr;
};

export const arrayMoveRight = <T>(arr: T[], val: T): T[] => {
  if (!arr.includes(val)) {
    return arr;
  }

  const oldIndex = arr.indexOf(val);
  const newIndex = oldIndex + 1;

  if (newIndex < arr.length) {
    return arrayMove(arr, oldIndex, newIndex);
  }
  return arr;
};
