export const distinctUntilChangedSimpleArray = (a: string[], b: string[]): boolean => {
  if (Array.isArray(a) && Array.isArray(b)) {
    return (
      (a as any).length === b.length &&
      (a as any).every((val: string, index: number) => val === b[index])
    );
  } else {
    return a === b;
  }
};
