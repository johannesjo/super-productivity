import { IS_TOUCH_PRIMARY } from './is-mouse-primary';

export const IS_MOBILE =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );

export const IS_SHOW_MOBILE_BOTTOM_NAV = IS_MOBILE && IS_TOUCH_PRIMARY;
