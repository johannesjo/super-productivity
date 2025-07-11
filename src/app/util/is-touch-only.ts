// export function isTouch(): boolean {
//   try {
//     document.createEvent('TouchEvent');
//     return true;
//   } catch (e) {
//     return false;
//   }
// }
// export const IS_TOUCH = isTouch();
import { deviceType } from 'detect-it';
import { IS_ANDROID_WEB_VIEW } from './is-android-web-view';

// @see https://css-tricks.com/interaction-media-features-and-their-potential-for-incorrect-assumptions/
export const isTouchOnly = (): boolean => deviceType === 'touchOnly';

// NOTE: not required to add IS_ANDROID_WEB_VIEW, but we make extra sure the value is set
export const IS_TOUCH_ONLY = IS_ANDROID_WEB_VIEW || isTouchOnly();

// [
//   'any-hover: hover',
//   'any-hover: none',
//   'any-pointer: fine',
//   'any-pointer: coarse',
//   'pointer: fine',
//   'pointer: coarse',
//   'hover: hover',
//   'hover: none',
// ].forEach((v) => {
//   Log.log(v, window.matchMedia('(' + v + ')').matches);
// });
