export const filterOutId =
  (idToFilterOut: string) =>
  (id: string): boolean =>
    id !== idToFilterOut;
