export const dedupeByKey = (arr, key) => {
  const temp = arr.map(el => el[key]);
  return arr.filter((el, i) =>
    temp.indexOf(el[key]) === i
  );
};
