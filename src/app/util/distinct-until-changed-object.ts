export const distinctUntilChangedObject = (a, b): boolean => !a || !b || (JSON.stringify(a) === JSON.stringify(b));
