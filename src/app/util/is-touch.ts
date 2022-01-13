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

// @see https://css-tricks.com/interaction-media-features-and-their-potential-for-incorrect-assumptions/
export const isTouchOnly = (): boolean =>
  window.matchMedia('(any-pointer: coarse)').matches &&
  !window.matchMedia('(any-pointer: fine)').matches;

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
//   console.log(v, window.matchMedia('(' + v + ')').matches);
// });
