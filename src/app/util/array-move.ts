export const arrayMove = (arr_, from, to, on = 1) => {

  const arr = arr_.splice(0);
  arr.splice(to, 0, ...arr.splice(from, on));
  return arr;
};

export const arrayMoveLeft = (arr, val) => {
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

export const arrayMoveRight = (arr, val) => {
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
