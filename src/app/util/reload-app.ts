import { IS_ELECTRON } from '../app.constants';

/**
 * Reloads the application properly in both Electron and browser contexts.
 * In Electron (especially on macOS), using window.location.reload() can cause
 * errors like "The application can't be opened. -120". This function uses the
 * proper Electron IPC event when running in Electron, and falls back to
 * window.location.reload() in browser contexts.
 */
export const reloadApp = (): void => {
  if (IS_ELECTRON && window.ea && typeof window.ea.reloadMainWin === 'function') {
    // Use Electron's proper reload method via IPC
    window.ea.reloadMainWin();
  } else {
    // Fallback for browser/PWA context
    window.location.reload();
  }
};
