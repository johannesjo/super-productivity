/**
 * Safari-compatible utility to detect if an event is a touch event
 * Avoids Safari's "ReferenceError: Can't find variable: TouchEvent" issue
 * by using property detection instead of instanceof checks
 */
export const isTouchEvent = (
  event: Event | MouseEvent | TouchEvent,
): event is TouchEvent => {
  return 'touches' in event;
};

/**
 * Safely checks if the current environment supports TouchEvent
 * Prevents ReferenceError in Safari Desktop where TouchEvent may be undefined
 */
export const isTouchEventSupported = (): boolean => {
  return typeof TouchEvent !== 'undefined';
};

/**
 * Safari-safe version of instanceof TouchEvent check
 * Falls back to property detection if TouchEvent constructor is unavailable
 */
export const isTouchEventInstance = (
  event: Event | MouseEvent | TouchEvent,
): event is TouchEvent => {
  if (isTouchEventSupported()) {
    return event instanceof TouchEvent;
  }
  return isTouchEvent(event);
};
