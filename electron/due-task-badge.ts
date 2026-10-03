import { app, nativeImage } from 'electron';
import { getWin } from './main-window';

export const setDueTaskBadge = (count: number, iconDataUrl?: string): void => {
  if (process.platform === 'win32') {
    // The renderer rasterizes numbers with Canvas/Segoe UI and sends PNG.
    const icon = count && iconDataUrl ? nativeImage.createFromDataURL(iconDataUrl) : null;
    if (count && (!icon || icon.isEmpty())) return;
    if (icon && (icon.getSize().width !== 64 || icon.getSize().height !== 64)) return;
    getWin()?.setOverlayIcon(icon, count ? `${count} tasks due today or overdue` : '');
  } else {
    // macOS Dock and Linux launchers that support Electron's badge API.
    app.setBadgeCount(count);
  }
};
