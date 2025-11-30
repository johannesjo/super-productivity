import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { IS_ANDROID_WEB_VIEW } from '../../util/is-android-web-view';

export type ShareSupport = 'native' | 'web' | 'none';

/**
 * Detect available share support on current platform.
 */
export const detectShareSupport = async (): Promise<ShareSupport> => {
  if (isCapacitorShareAvailable()) {
    return 'native';
  }

  if (IS_ANDROID_WEB_VIEW) {
    return 'native';
  }

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    return 'web';
  }

  return 'none';
};

/**
 * Check if native/system share is available on current platform.
 */
export const isSystemShareAvailable = async (): Promise<boolean> => {
  if (isCapacitorShareAvailable()) {
    return true;
  }

  if (IS_ANDROID_WEB_VIEW) {
    return true;
  }

  if (typeof navigator !== 'undefined' && 'share' in navigator) {
    return true;
  }

  return false;
};

/**
 * Check if Capacitor Share plugin is available.
 */
export const isCapacitorShareAvailable = (): boolean => {
  const sharePlugin = getCapacitorSharePlugin();
  return !!sharePlugin;
};

/**
 * Get Capacitor Share plugin if available.
 */
export const getCapacitorSharePlugin = (): typeof Share | null => {
  if (Capacitor.isNativePlatform() || IS_ANDROID_WEB_VIEW) {
    return Share;
  }

  return null;
};
