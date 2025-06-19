import { Injectable, OnDestroy } from '@angular/core';
import {
  Hooks,
  PluginHookHandler,
  PluginHookHandlerRegistration,
} from './plugin-api.model';

@Injectable({
  providedIn: 'root',
})
export class PluginHooksService implements OnDestroy {
  private _hookHandlers: PluginHookHandlerRegistration[] = [];
  private _hookTimeouts = new Map<string, Set<any>>();

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

    // Execute all handlers with comprehensive error handling
    const promises = handlersToCall.map(async (registration) => {
      try {
        // Create execution promise first
        const executionPromise = Promise.resolve(registration.handler(payload));

        // Set a timeout for plugin hook execution to prevent hanging
        const timeoutPromise = new Promise<void>((_, reject) => {
          const timeoutId: any = setTimeout(
            () => reject(new Error('Plugin hook execution timeout')),
            10000,
          ); // 10 second timeout
          // Track timeout for cleanup
          if (!this._hookTimeouts.has(registration.pluginId)) {
            this._hookTimeouts.set(registration.pluginId, new Set());
          }
          this._hookTimeouts.get(registration.pluginId)!.add(timeoutId);
          // Clean up timeout when done
          executionPromise.finally(() => {
            clearTimeout(timeoutId);
            this._hookTimeouts.get(registration.pluginId)?.delete(timeoutId);
          });
        });

        await Promise.race([executionPromise, timeoutPromise]);
        console.log(
          `Hook ${hookName} executed successfully for plugin ${registration.pluginId}`,
        );
      } catch (error) {
        console.error(
          `Hook ${hookName} failed for plugin ${registration.pluginId}:`,
          error,
        );
        // Log detailed error information for debugging
        const errorDetails = {
          pluginId: registration.pluginId,
          hookName,
          error:
            error instanceof Error
              ? {
                  message: error.message,
                  stack: error.stack,
                  name: error.name,
                }
              : error,
          timestamp: new Date().toISOString(),
        };

        console.warn('Plugin hook error details:', errorDetails);

        // TODO: Could emit an event here for error tracking/reporting
        // this._errorReportingService.reportPluginError(errorDetails);

        // Continue with other handlers even if one fails
      }
    });

    // Wait for all handlers to complete
    await Promise.allSettled(promises);
  }

  /**
   * Register a hook handler (called by plugins via PluginAPI)
   */
  registerHookHandler(pluginId: string, hook: Hooks, handler: PluginHookHandler): void {
    const hookHandler: PluginHookHandlerRegistration = {
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
   * Clean up all resources when service is destroyed
   */
  ngOnDestroy(): void {
    console.log('PluginHooksService: Cleaning up resources');

    // Clear all hook timeouts
    this._hookTimeouts.forEach((timeouts, pluginId) => {
      timeouts.forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
    });
    this._hookTimeouts.clear();

    // Clear all hook handlers
    this._hookHandlers = [];

    console.log('PluginHooksService: Cleanup complete');
  }
}
