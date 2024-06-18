export function isTouchOnly(): boolean {
  return window.matchMedia('(pointer: coarse)').matches;
}

export const IS_TOUCH_ONLY = isTouchOnly();
