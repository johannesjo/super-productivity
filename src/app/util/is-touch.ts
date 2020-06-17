export function isTouch(): boolean {
  try {
    document.createEvent('TouchEvent');
    return true;
  } catch (e) {
    return false;
  }
}

export function isTouchOnly(): boolean {
  return window.matchMedia('(pointer: coarse)').matches;
}

export const IS_TOUCH = isTouch();
export const IS_TOUCH_ONLY = isTouchOnly();
