import { Injectable } from '@angular/core';
import { Hooks, PluginHookHandler } from '@super-productivity/plugin-api';
import { PluginLog } from '../core/log';

/**
 * Simplified plugin hooks service following KISS principles.
 * No timeouts, no complex error handling - just call the hooks.
 */
@Injectable({
  providedIn: 'root',
})
export class PluginHooksService {
  private _handlers = new Map<Hooks, Map<string, PluginHookHandler<any>>>();

  /**
   * Register a hook handler
   */
  registerHookHandler<T extends Hooks>(
    pluginId: string,
    hook: T,
    handler: PluginHookHandler<T>,
  ): void {
    if (!this._handlers.has(hook)) {
      this._handlers.set(hook, new Map());
    }
    this._handlers.get(hook)!.set(pluginId, handler);
    PluginLog.log(`Plugin ${pluginId} registered for ${hook}`);
  }

  /**
   * Dispatch a hook to all registered handlers
   */
  async dispatchHook(hook: Hooks, payload?: unknown): Promise<void> {
    const handlers = this._handlers.get(hook);
    if (!handlers || handlers.size === 0) {
      return;
    }

    // Call all handlers - simple and direct
    for (const [pluginId, handler] of handlers) {
      try {
        await handler(payload);
      } catch (error) {
        PluginLog.err(`Plugin ${pluginId} ${hook} handler error:`, error);
        // Continue with other handlers
      }
    }
  }

  /**
   * Unregister all hooks for a plugin
   */
  unregisterPluginHooks(pluginId: string): void {
    for (const handlers of this._handlers.values()) {
      handlers.delete(pluginId);
    }
  }

  /**
   * Clear all hooks (for cleanup)
   */
  clearAllHooks(): void {
    this._handlers.clear();
  }
}
