import { PluginBridgeService } from '../plugin-bridge.service';
import { PluginBaseCfg, PluginManifest } from '../plugin-api.model';

/**
 * Configuration for creating a plugin iframe
 */
export interface PluginIframeConfig {
  /** The unique identifier of the plugin */
  pluginId: string;
  /** The plugin's manifest containing metadata */
  manifest: PluginManifest;
  /** The HTML content to render in the iframe */
  indexHtml: string;
  /** Base configuration passed to the plugin (theme, platform, etc.) */
  baseCfg: PluginBaseCfg;
  /** Bridge service for plugin-to-app communication */
  pluginBridge: PluginBridgeService;
  /** Optional callback for custom message handling */
  onMessage?: (data: unknown) => void;
}

/**
 * Creates the PluginAPI script to inject into the iframe.
 * This script sets up the global PluginAPI object that plugins use to interact with the app.
 *
 * @param config - Configuration containing plugin metadata and bridge service
 * @returns JavaScript code as a string to be injected into the iframe
 */
export const createPluginApiScript = (config: PluginIframeConfig): string => {
  return `
    <script>
      (function() {
        'use strict';
        
        // Create PluginAPI instance
        const pluginBridge = {
          _setCurrentPlugin: () => {},
          ${Object.getOwnPropertyNames(PluginBridgeService.prototype)
            .filter((name) => name !== 'constructor' && !name.startsWith('_'))
            .map((methodName) => {
              return `${methodName}: async function(...args) {
                return new Promise((resolve, reject) => {
                  const messageId = Math.random().toString(36).substr(2, 9);
                  const message = {
                    type: 'plugin-api-call',
                    method: '${methodName}',
                    args: args,
                    messageId: messageId
                  };
                  
                  function handleResponse(event) {
                    if (event.data && event.data.type === 'plugin-api-response' && event.data.messageId === messageId) {
                      window.removeEventListener('message', handleResponse);
                      if (event.data.error) {
                        reject(new Error(event.data.error));
                      } else {
                        resolve(event.data.result);
                      }
                    }
                  }
                  
                  window.addEventListener('message', handleResponse);
                  window.parent.postMessage(message, '*');
                });
              }`;
            })
            .join(',\n          ')}
        };
        
        // Initialize global PluginAPI
        window.PluginAPI = new (function PluginAPI() {
          const self = this;
          
          // Copy base config
          this.cfg = ${JSON.stringify(config.baseCfg)};
          
          // Copy all bridge methods
          Object.keys(pluginBridge).forEach(key => {
            if (typeof pluginBridge[key] === 'function') {
              self[key] = pluginBridge[key];
            }
          });
          
          // Add special methods
          this.showIndexHtmlAsView = function() {
            console.warn('showIndexHtmlAsView is not available for side panel plugins');
          };
          
          // Register methods are synchronous
          const registrationMethods = {
            registerHook: true,
            registerHeaderButton: true,
            registerMenuEntry: true,
            registerShortcut: true,
            registerSidePanelButton: true
          };
          
          Object.keys(registrationMethods).forEach(methodName => {
            const originalMethod = self[methodName];
            self[methodName] = function(...args) {
              // For registration methods, we still use promises but resolve immediately
              originalMethod.apply(self, args).then(() => {
                console.log('${config.pluginId}: ' + methodName + ' registered');
              }).catch(err => {
                console.error('${config.pluginId}: ' + methodName + ' failed:', err);
              });
            };
          });
        })();
        
        // Notify parent that plugin is ready
        window.parent.postMessage({ type: 'plugin-ready', pluginId: '${config.pluginId}' }, '*');
      })();
    </script>
  `;
};

/**
 * Creates a data URL for the plugin iframe by injecting the PluginAPI script into the HTML.
 * This allows plugins to run in an isolated context while still having access to the API.
 *
 * @param config - Configuration containing plugin HTML and metadata
 * @returns Base64-encoded data URL containing the modified HTML
 */
export const createPluginIframeUrl = (config: PluginIframeConfig): string => {
  const apiScript = createPluginApiScript(config);

  // Inject the PluginAPI script before the closing body tag
  let modifiedHtml = config.indexHtml;
  const bodyCloseIndex = modifiedHtml.toLowerCase().lastIndexOf('</body>');

  if (bodyCloseIndex !== -1) {
    modifiedHtml =
      modifiedHtml.slice(0, bodyCloseIndex) +
      apiScript +
      modifiedHtml.slice(bodyCloseIndex);
  } else {
    // If no body tag, append at the end
    modifiedHtml += apiScript;
  }

  // Create data URL
  const blobText = btoa(unescape(encodeURIComponent(modifiedHtml)));
  return `data:text/html;base64,${blobText}`;
};

/**
 * Creates a message handler for iframe postMessage communication.
 * Handles plugin API calls and forwards them to the appropriate bridge methods.
 *
 * @param config - Configuration containing plugin metadata and bridge service
 * @returns Async event handler function for message events
 */
export const createIframeMessageHandler = (
  config: PluginIframeConfig,
): ((event: MessageEvent) => Promise<void>) => {
  return async (event: MessageEvent) => {
    // Validate origin (data URLs have 'null' origin)
    if (event.origin !== 'null' && event.origin !== window.location.origin) {
      return;
    }

    const data = event.data;
    if (!data || typeof data !== 'object' || data === null) {
      return;
    }

    // Type guard for plugin API calls
    if ('type' in data && data.type === 'plugin-api-call' && 'messageId' in data) {
      try {
        // Set current plugin context
        config.pluginBridge._setCurrentPlugin(config.pluginId);

        // Get the method to call with proper type checking
        const bridgeAny = config.pluginBridge as any;
        let methodName = String(data.method);

        // Map some method names for compatibility
        if (methodName === 'loadSyncedData') {
          methodName = 'loadPersistedData';
        }

        // Security: Only allow calling public methods (not starting with _)
        if (methodName.startsWith('_')) {
          throw new Error(`Access denied: Cannot call private method ${methodName}`);
        }

        const method = bridgeAny[methodName];

        if (typeof method !== 'function') {
          throw new Error(`Method ${methodName} not found on plugin bridge`);
        }

        // Call the method with arguments
        const args = Array.isArray(data.args) ? data.args : [];
        const result = await method.apply(config.pluginBridge, args);

        // Send response back to iframe
        event.source?.postMessage(
          {
            type: 'plugin-api-response',
            messageId: data.messageId,
            result: result,
          },
          { targetOrigin: event.origin },
        );
      } catch (error) {
        // Send error back to iframe
        event.source?.postMessage(
          {
            type: 'plugin-api-response',
            messageId: data.messageId,
            error: error instanceof Error ? error.message : String(error),
          },
          { targetOrigin: event.origin },
        );
      }
    }

    // Type guard for plugin ready event
    if (
      'type' in data &&
      data.type === 'plugin-ready' &&
      'pluginId' in data &&
      data.pluginId === config.pluginId
    ) {
      console.log(`Plugin ${config.pluginId} iframe is ready`);
    }

    // Handle plugin messages (for plugin-to-plugin communication)
    if ('type' in data && data.type === 'PLUGIN_MESSAGE') {
      try {
        // Forward the message to the plugin's message handler
        const result = await config.pluginBridge.sendMessageToPlugin(
          config.pluginId,
          data.data,
        );

        // Send response back to iframe if messageId was provided
        if (data.messageId && event.source) {
          event.source.postMessage(
            {
              type: 'PLUGIN_MESSAGE_RESPONSE',
              messageId: data.messageId,
              result,
            },
            { targetOrigin: event.origin },
          );
        }
      } catch (error) {
        // Send error back to iframe if messageId was provided
        if (data.messageId && event.source) {
          event.source.postMessage(
            {
              type: 'PLUGIN_MESSAGE_RESPONSE',
              messageId: data.messageId,
              error: error instanceof Error ? error.message : String(error),
            },
            { targetOrigin: event.origin },
          );
        }
      }
    }

    // Call custom message handler if provided
    if (config.onMessage) {
      config.onMessage(data);
    }
  };
};
