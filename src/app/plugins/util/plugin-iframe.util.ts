import { PluginBridgeService } from '../plugin-bridge.service';
import { PluginBaseCfg, PluginManifest } from '../plugin-api.model';

export interface PluginIframeConfig {
  pluginId: string;
  manifest: PluginManifest;
  indexHtml: string;
  baseCfg: PluginBaseCfg;
  pluginBridge: PluginBridgeService;
  onMessage?: (data: any) => void;
}

/**
 * Creates the PluginAPI script to inject into the iframe
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
 * Creates a data URL for the plugin iframe
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
 * Handles iframe message events
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
    if (!data || typeof data !== 'object') {
      return;
    }

    // Handle plugin API calls
    if (data.type === 'plugin-api-call' && data.messageId) {
      try {
        // Set current plugin context
        config.pluginBridge._setCurrentPlugin(config.pluginId);

        // Get the method to call
        const method = (config.pluginBridge as any)[data.method];
        if (typeof method !== 'function') {
          throw new Error(`Method ${data.method} not found`);
        }

        // Call the method
        const result = await method.apply(config.pluginBridge, data.args || []);

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

    // Handle plugin ready event
    if (data.type === 'plugin-ready' && data.pluginId === config.pluginId) {
      console.log(`Plugin ${config.pluginId} iframe is ready`);
    }

    // Call custom message handler if provided
    if (config.onMessage) {
      config.onMessage(data);
    }
  };
};
