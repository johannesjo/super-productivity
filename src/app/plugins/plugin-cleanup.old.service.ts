import { Injectable, OnDestroy } from '@angular/core';

/**
 * Centralized cleanup tracking service for the plugin system
 * Tracks resources that need to be cleaned up to prevent memory leaks
 */
@Injectable({
  providedIn: 'root',
})
export class PluginCleanupService implements OnDestroy {
  // Track timers per plugin
  private _pluginTimers = new Map<string, Set<number>>();

  // Track intervals per plugin
  private _pluginIntervals = new Map<string, Set<number>>();

  // Track event listeners per plugin
  private _pluginListeners = new Map<
    string,
    Array<{
      target: EventTarget;
      type: string;
      listener: EventListener;
      options?: boolean | AddEventListenerOptions;
    }>
  >();

  // Track abort controllers for fetch requests
  private _pluginAbortControllers = new Map<string, Set<AbortController>>();

  // Track iframe elements
  private _pluginIframes = new Map<string, HTMLIFrameElement>();

  /**
   * Register a timer for a plugin
   */
  registerTimer(pluginId: string, timerId: number): void {
    if (!this._pluginTimers.has(pluginId)) {
      this._pluginTimers.set(pluginId, new Set());
    }
    this._pluginTimers.get(pluginId)!.add(timerId);
  }

  /**
   * Unregister a timer for a plugin
   */
  unregisterTimer(pluginId: string, timerId: number): void {
    this._pluginTimers.get(pluginId)?.delete(timerId);
  }

  /**
   * Register an interval for a plugin
   */
  registerInterval(pluginId: string, intervalId: number): void {
    if (!this._pluginIntervals.has(pluginId)) {
      this._pluginIntervals.set(pluginId, new Set());
    }
    this._pluginIntervals.get(pluginId)!.add(intervalId);
  }

  /**
   * Register an event listener for a plugin
   */
  registerEventListener(
    pluginId: string,
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: boolean | AddEventListenerOptions,
  ): void {
    if (!this._pluginListeners.has(pluginId)) {
      this._pluginListeners.set(pluginId, []);
    }
    this._pluginListeners.get(pluginId)!.push({ target, type, listener, options });
  }

  /**
   * Register an abort controller for a plugin
   */
  registerAbortController(pluginId: string, controller: AbortController): void {
    if (!this._pluginAbortControllers.has(pluginId)) {
      this._pluginAbortControllers.set(pluginId, new Set());
    }
    this._pluginAbortControllers.get(pluginId)!.add(controller);
  }

  /**
   * Register an iframe element for a plugin
   */
  registerIframe(pluginId: string, iframe: HTMLIFrameElement): void {
    // Clean up any existing iframe first
    this.cleanupIframe(pluginId);
    this._pluginIframes.set(pluginId, iframe);
  }

  /**
   * Clean up all resources for a specific plugin
   */
  cleanupPlugin(pluginId: string): void {
    console.log(`Cleaning up resources for plugin: ${pluginId}`);

    // Clear all timers
    const timers = this._pluginTimers.get(pluginId);
    if (timers) {
      timers.forEach((timerId) => clearTimeout(timerId));
      this._pluginTimers.delete(pluginId);
    }

    // Clear all intervals
    const intervals = this._pluginIntervals.get(pluginId);
    if (intervals) {
      intervals.forEach((intervalId) => clearInterval(intervalId));
      this._pluginIntervals.delete(pluginId);
    }

    // Remove all event listeners
    const listeners = this._pluginListeners.get(pluginId);
    if (listeners) {
      listeners.forEach(({ target, type, listener, options }) => {
        target.removeEventListener(type, listener, options);
      });
      this._pluginListeners.delete(pluginId);
    }

    // Abort all fetch requests
    const controllers = this._pluginAbortControllers.get(pluginId);
    if (controllers) {
      controllers.forEach((controller) => controller.abort());
      this._pluginAbortControllers.delete(pluginId);
    }

    // Clean up iframe
    this.cleanupIframe(pluginId);
  }

  /**
   * Clean up iframe for a specific plugin
   */
  private cleanupIframe(pluginId: string): void {
    const iframe = this._pluginIframes.get(pluginId);
    if (iframe) {
      // Clear src to release resources
      iframe.src = 'about:blank';

      // Remove from DOM if still attached
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }

      this._pluginIframes.delete(pluginId);
    }
  }

  /**
   * Clean up all resources for all plugins
   */
  cleanupAll(): void {
    console.log('Cleaning up all plugin resources');

    // Get all plugin IDs
    const pluginIds = new Set([
      ...this._pluginTimers.keys(),
      ...this._pluginIntervals.keys(),
      ...this._pluginListeners.keys(),
      ...this._pluginAbortControllers.keys(),
      ...this._pluginIframes.keys(),
    ]);

    // Clean up each plugin
    pluginIds.forEach((pluginId) => this.cleanupPlugin(pluginId));
  }

  /**
   * Get resource usage statistics for debugging
   */
  getResourceStats(): Record<
    string,
    {
      timers: number;
      intervals: number;
      listeners: number;
      abortControllers: number;
      hasIframe: boolean;
    }
  > {
    const stats: Record<string, any> = {};

    // Collect all plugin IDs
    const pluginIds = new Set([
      ...this._pluginTimers.keys(),
      ...this._pluginIntervals.keys(),
      ...this._pluginListeners.keys(),
      ...this._pluginAbortControllers.keys(),
      ...this._pluginIframes.keys(),
    ]);

    pluginIds.forEach((pluginId) => {
      stats[pluginId] = {
        timers: this._pluginTimers.get(pluginId)?.size || 0,
        intervals: this._pluginIntervals.get(pluginId)?.size || 0,
        listeners: this._pluginListeners.get(pluginId)?.length || 0,
        abortControllers: this._pluginAbortControllers.get(pluginId)?.size || 0,
        hasIframe: this._pluginIframes.has(pluginId),
      };
    });

    return stats;
  }

  ngOnDestroy(): void {
    // Clean up all resources when service is destroyed
    this.cleanupAll();
  }
}
