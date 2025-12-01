export const assertTruthy = <T>(value: T | undefined | null): T => {
  if (!value) {
    if (value === undefined) {
      throw new Error('Expected value NOT to be undefined');
    }
    if (value === null) {
      throw new Error('Expected value NOT to be null');
    }
    throw new Error(`Expected ${value} NOT to be falsy`);
  }
  return value;
};
