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

// TODO check if IS_ANDROID_WEB_VIEW is really required
export const IS_TOUCH_ONLY = isTouchOnly() || IS_ANDROID_WEB_VIEW;
