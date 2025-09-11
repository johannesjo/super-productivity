import { Injectable } from '@angular/core';

type PanelContentType =
  | 'NOTES'
  | 'TASK'
  | 'ADD_TASK_PANEL'
  | 'ISSUE_PANEL'
  | 'TASK_VIEW_CUSTOMIZER_PANEL'
  | 'PLUGIN';

const STORAGE_KEY_PREFIX = 'bottom_panel_height_';
const DEFAULT_HEIGHT_VH = 60; // 3/5 of viewport height

@Injectable({
  providedIn: 'root',
})
export class BottomPanelPositionService {
  /**
   * Get the saved height for a panel type, or return default
   */
  getSavedHeight(panelType: PanelContentType): number {
    const key = STORAGE_KEY_PREFIX + panelType;
    const saved = localStorage.getItem(key);

    if (saved) {
      const parsedHeight = parseFloat(saved);
      // Validate the saved height is within reasonable bounds
      if (parsedHeight >= 20 && parsedHeight <= 98) {
        return (parsedHeight / 100) * window.innerHeight;
      }
    }

    // Return default height (3/5 of viewport)
    return (DEFAULT_HEIGHT_VH / 100) * window.innerHeight;
  }

  /**
   * Save the current height for a panel type
   */
  saveHeight(panelType: PanelContentType, heightInPixels: number): void {
    const key = STORAGE_KEY_PREFIX + panelType;
    const heightAsVh = (heightInPixels / window.innerHeight) * 100;

    // Only save if it's within valid bounds
    if (heightAsVh >= 20 && heightAsVh <= 98) {
      localStorage.setItem(key, heightAsVh.toString());
    }
  }

  /**
   * Clear saved position for a panel type
   */
  clearSavedHeight(panelType: PanelContentType): void {
    const key = STORAGE_KEY_PREFIX + panelType;
    localStorage.removeItem(key);
  }

  /**
   * Clear all saved positions
   */
  clearAllSavedHeights(): void {
    const keys = Object.keys(localStorage).filter((key) =>
      key.startsWith(STORAGE_KEY_PREFIX),
    );
    keys.forEach((key) => localStorage.removeItem(key));
  }
}
