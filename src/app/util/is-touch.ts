// export function isTouch(): boolean {
//   try {
//     document.createEvent('TouchEvent');
//     return true;
//   } catch (e) {
//     return false;
//   }
// }
// export const IS_TOUCH = isTouch();

import { IS_ANDROID_WEB_VIEW } from './is-android-web-view';

export const isTouchOnly = (): boolean => window.matchMedia('(pointer: coarse)').matches;

// NOTE: not required to add IS_ANDROID_WEB_VIEW, but we make extra sure the value is set
export const IS_TOUCH_ONLY = isTouchOnly() || IS_ANDROID_WEB_VIEW;
