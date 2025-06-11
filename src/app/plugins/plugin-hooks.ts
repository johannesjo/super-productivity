import { Injectable } from '@angular/core';
import { Hooks, PluginHookHandler } from './plugin-api.model';

@Injectable({
  providedIn: 'root',
})
export class PluginHooksService {
  private _hookHandlers: PluginHookHandler[] = [];

  constructor() {}

  /**
   * Dispatch a hook to all registered plugin handlers
   */
  async dispatchHook(hookName: Hooks, payload?: any): Promise<void> {
    console.log(`Dispatching hook: ${hookName}`, payload);

    // Get all registered handlers for this hook
    const handlersToCall = this._hookHandlers.filter(
      (handler) => handler.hook === hookName,
    );

    if (handlersToCall.length === 0) {
      console.log(`No handlers registered for hook: ${hookName}`);
      return;
    }

    // Execute all handlers
    const promises = handlersToCall.map(async ({ pluginId, handler }) => {
      try {
        await handler(payload);
        console.log(`Hook ${hookName} executed successfully for plugin ${pluginId}`);
      } catch (error) {
        console.error(`Hook ${hookName} failed for plugin ${pluginId}:`, error);
        // Continue with other handlers even if one fails
      }
    });

    // Wait for all handlers to complete
    await Promise.allSettled(promises);
  }

  /**
   * Register a hook handler (called by plugins via PluginAPI)
   */
  registerHookHandler(
    pluginId: string,
    hook: Hooks,
    handler: (...args: any[]) => void | Promise<void>,
  ): void {
    const hookHandler: PluginHookHandler = {
      pluginId,
      hook,
      handler,
    };

    this._hookHandlers.push(hookHandler);
    console.log(`Registered hook handler for ${hook} from plugin ${pluginId}`);
  }

  /**
   * Unregister all hook handlers for a specific plugin
   */
  unregisterPluginHooks(pluginId: string): void {
    const initialLength = this._hookHandlers.length;
    this._hookHandlers = this._hookHandlers.filter(
      (handler) => handler.pluginId !== pluginId,
    );
    const removedCount = initialLength - this._hookHandlers.length;

    if (removedCount > 0) {
      console.log(`Unregistered ${removedCount} hook handlers for plugin ${pluginId}`);
    }
  }

  /**
   * Get all registered hook handlers for debugging
   */
  getAllHookHandlers(): PluginHookHandler[] {
    return [...this._hookHandlers];
  }

  /**
   * Get hook handlers for a specific hook
   */
  getHandlersForHook(hook: Hooks): PluginHookHandler[] {
    return this._hookHandlers.filter((handler) => handler.hook === hook);
  }

  /**
   * Get hook handlers for a specific plugin
   */
  getHandlersForPlugin(pluginId: string): PluginHookHandler[] {
    return this._hookHandlers.filter((handler) => handler.pluginId === pluginId);
  }

  /**
   * Check if any plugins have handlers for a specific hook
   */
  hasHandlersForHook(hook: Hooks): boolean {
    return this._hookHandlers.some((handler) => handler.hook === hook);
  }
}
