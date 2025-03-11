export const omit = <T extends object, K extends keyof T>(
  obj: T,
  keyToOmit: K,
): Omit<T, K> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { [keyToOmit]: _, ...rest } = obj;
  return rest;
};
