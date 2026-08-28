import { IS_ELECTRON } from '../../app.constants';
import { IS_ANDROID_WEB_VIEW } from '../../util/is-android-web-view';
import { IS_IOS } from '../../util/is-ios';

/**
 * Platform-derived label for this device, shown on OTHER devices ("Tracking
 * on Desktop"). Deliberately coarse — no hostname or model, so nothing
 * personally identifying transits the server when encryption is off, and no
 * settings field is needed. The payload field stays a free string so richer
 * labels can ship later without a protocol change.
 */
export const getDeviceLabel = (): string => {
  if (IS_ELECTRON) {
    return 'Desktop';
  }
  if (IS_ANDROID_WEB_VIEW) {
    return 'Android';
  }
  if (IS_IOS) {
    return 'iOS';
  }
  return 'Browser';
};
