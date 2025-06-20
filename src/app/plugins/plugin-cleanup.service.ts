import { Injectable } from '@angular/core';

/**
 * Simplified cleanup service following KISS principles.
 * Only track what's absolutely necessary - iframes.
 * Let JavaScript's garbage collector handle the rest.
 */
@Injectable({
  providedIn: 'root',
})
export class PluginCleanupService {
  private _pluginIframes = new Map<string, HTMLIFrameElement>();

  /**
   * Register an iframe for cleanup
   */
  registerIframe(pluginId: string, iframe: HTMLIFrameElement): void {
    this._pluginIframes.set(pluginId, iframe);
  }

  /**
   * Clean up resources for a specific plugin
   */
  cleanupPlugin(pluginId: string): void {
    // Remove iframe if it exists
    const iframe = this._pluginIframes.get(pluginId);
    if (iframe && iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
    this._pluginIframes.delete(pluginId);
  }

  /**
   * Clean up all resources
   */
  cleanupAll(): void {
    for (const [pluginId] of this._pluginIframes) {
      this.cleanupPlugin(pluginId);
    }
    this._pluginIframes.clear();
  }
}
