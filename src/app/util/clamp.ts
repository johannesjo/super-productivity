export const clamp = (value: number, max: number): number =>
  Math.max(0, Math.min(max, value));
