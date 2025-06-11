import { Injectable } from '@angular/core';
import {
  PluginCallback,
  PluginMessage,
  PluginMessageResponse,
  PluginMessageType,
} from './plugin-messaging.model';
import { PluginBridgeService } from './plugin-bridge.service';
import { PluginHooksService } from './plugin-hooks';
import { nanoid } from 'nanoid';

/**
 * PluginMessagingService handles communication between plugins and the main application
 * Uses a request/response pattern with message passing instead of direct service injection
 */
@Injectable({
  providedIn: 'root',
})
export class PluginMessagingService {
  private _callbacks = new Map<string, PluginCallback>();
  private _pendingResponses = new Map<
    string,
    (response: PluginMessageResponse) => void
  >();

  constructor(
    private _pluginBridge: PluginBridgeService,
    private _pluginHooks: PluginHooksService,
  ) {}

  /**
   * Register a callback function for a plugin
   */
  registerCallback(
    pluginId: string,
    fn: (...args: any[]) => void | Promise<void>,
  ): string {
    const callbackId = nanoid();
    this._callbacks.set(callbackId, {
      id: callbackId,
      pluginId,
      fn,
    });
    return callbackId;
  }

  /**
   * Execute a registered callback
   */
  async executeCallback(callbackId: string, ...args: any[]): Promise<void> {
    const callback = this._callbacks.get(callbackId);
    if (callback) {
      await callback.fn(...args);
    } else {
      console.warn(`Plugin callback ${callbackId} not found`);
    }
  }

  /**
   * Handle incoming messages from plugins
   */
  async handleMessage(
    message: PluginMessage,
    pluginId: string,
  ): Promise<PluginMessageResponse> {
    try {
      let data: any = undefined;
      console.log('PluginMessagingService received message:', message);

      switch (message.type) {
        case PluginMessageType.SHOW_SNACK:
          this._pluginBridge.showSnack(message.payload.snackCfg);
          break;

        case PluginMessageType.NOTIFY:
          this._pluginBridge.notify(message.payload.notifyCfg);
          break;

        case PluginMessageType.OPEN_DIALOG:
          await this._pluginBridge.openDialog(message.payload.dialogCfg);
          break;

        case PluginMessageType.GET_ALL_TASKS:
          data = await this._pluginBridge.getAllTasks();
          break;

        case PluginMessageType.GET_ARCHIVED_TASKS:
          data = await this._pluginBridge.getArchivedTasks();
          break;

        case PluginMessageType.GET_CURRENT_CONTEXT_TASKS:
          data = await this._pluginBridge.getCurrentContextTasks();
          break;

        case PluginMessageType.UPDATE_TASK:
          await this._pluginBridge.updateTask(
            message.payload.taskId,
            message.payload.updates,
          );
          break;

        case PluginMessageType.REGISTER_HOOK:
          // Store the callback and register with hooks service
          const hookCallback = this._callbacks.get(message.payload.callbackId);
          if (hookCallback) {
            this._pluginHooks.registerHookHandler(
              pluginId,
              message.payload.hook,
              hookCallback.fn,
            );
          }
          break;

        case PluginMessageType.REGISTER_ISSUE_PROVIDER:
          // Handle issue provider registration
          console.log(
            `Plugin ${pluginId} registered issue provider:`,
            message.payload.provider,
          );
          break;

        case PluginMessageType.REGISTER_HEADER_BUTTON:
        case PluginMessageType.REGISTER_MENU_ENTRY:
        case PluginMessageType.REGISTER_SHORTCUT:
          // Handle UI element registration
          console.log(
            `Plugin ${pluginId} registered UI element:`,
            message.type,
            message.payload,
          );
          break;

        case PluginMessageType.PERSIST_DATA:
          this._pluginBridge.persistDataSynced(message.payload.dataStr);
          break;

        case PluginMessageType.GET_CONFIG:
          data = await this._pluginBridge.getCfg();
          break;

        case PluginMessageType.ADD_ACTION_BEFORE_CLOSE:
          const closeCallback = this._callbacks.get(message.payload.callbackId);
          if (closeCallback) {
            // Wrap the callback to match the expected signature
            const wrappedCallback = async (): Promise<void> => {
              const result = closeCallback.fn();
              if (result instanceof Promise) {
                await result;
              }
            };
            this._pluginBridge.addActionBeforeCloseApp(wrappedCallback);
          }
          break;

        case PluginMessageType.SHOW_INDEX_HTML:
          console.log(`Plugin ${pluginId} requested to show index.html`);
          break;

        default:
          throw new Error(`Unknown message type: ${message.type}`);
      }

      return {
        id: message.id,
        success: true,
        data,
      };
    } catch (error) {
      console.error(`Error handling plugin message:`, error);
      return {
        id: message.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send a message and wait for response (for use by plugin-side API)
   */
  async sendMessage(message: PluginMessage): Promise<PluginMessageResponse> {
    return new Promise((resolve) => {
      this._pendingResponses.set(message.id, resolve);
      // In a real implementation, this would send the message to the plugin
      // For now, we'll handle it directly since we're in the same context
      this.handleMessage(message, 'unknown').then((response) => {
        const responseHandler = this._pendingResponses.get(response.id);
        if (responseHandler) {
          responseHandler(response);
          this._pendingResponses.delete(response.id);
        }
      });
    });
  }

  /**
   * Clean up callbacks for a specific plugin
   */
  cleanupPlugin(pluginId: string): void {
    for (const [callbackId, callback] of this._callbacks.entries()) {
      if (callback.pluginId === pluginId) {
        this._callbacks.delete(callbackId);
      }
    }
    this._pluginHooks.unregisterPluginHooks(pluginId);
  }
}
