import { Capacitor } from '@capacitor/core';
import { IS_ANDROID_WEB_VIEW } from '../../util/is-android-web-view';

export type ShareSupport = 'native' | 'web' | 'none';

/**
 * Detect available share support on current platform.
 */
export const detectShareSupport = async (): Promise<ShareSupport> => {
  if (await isCapacitorShareAvailable()) {
    return 'native';
  }

  if (IS_ANDROID_WEB_VIEW) {
    const win = window as any;
    if (win.Capacitor?.Plugins?.Share) {
      return 'native';
    }
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
  if (await isCapacitorShareAvailable()) {
    return true;
  }

  if (IS_ANDROID_WEB_VIEW) {
    const win = window as any;
    return !!win.Capacitor?.Plugins?.Share;
  }

  if (typeof navigator !== 'undefined' && 'share' in navigator) {
    return true;
  }

  return false;
};

/**
 * Check if Capacitor Share plugin is available.
 */
export const isCapacitorShareAvailable = async (): Promise<boolean> => {
  const sharePlugin = await getCapacitorSharePlugin();
  return !!sharePlugin;
};

/**
 * Get Capacitor Share plugin if available.
 */
export const getCapacitorSharePlugin = async (): Promise<any | null> => {
  if (typeof window === 'undefined') {
    return null;
  }

  const win = window as any;

  if (Capacitor.isNativePlatform()) {
    const nativePlugin = win.Capacitor?.Plugins?.Share;
    if (nativePlugin && typeof nativePlugin.share === 'function') {
      return nativePlugin;
    }
  }

  if (IS_ANDROID_WEB_VIEW) {
    const webViewPlugin = win.Capacitor?.Plugins?.Share;
    if (webViewPlugin && typeof webViewPlugin.share === 'function') {
      return webViewPlugin;
    }
  }

  return null;
};
