export const objectMap = (object: Object, mapFn: Function) => {
  return Object.keys(object).reduce(function (result, key) {
    result[key] = mapFn(object[key], key);
    return result;
  }, {});
};
