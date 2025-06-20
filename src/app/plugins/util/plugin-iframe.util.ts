import { PluginBridgeService } from '../plugin-bridge.service';
import { PluginBaseCfg, PluginManifest } from '../plugin-api.model';
import { SnackCfg } from '@super-productivity/plugin-api';
import {
  NotifyCfg,
  DialogCfg,
  PluginCreateTaskData,
  TaskCopy,
  ProjectCopy,
  TagCopy,
} from '../plugin-api.model';

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
  /** API script generation style - 'simple' for direct method exposure, 'dynamic' for reflection-based */
  apiStyle?: 'simple' | 'dynamic';
  /** Whether to enable showIndexHtmlAsView method (for full-page plugins) */
  enableIndexView?: boolean;
}

/**
 * Standard iframe sandbox attributes for plugin security
 */
export const PLUGIN_IFRAME_SANDBOX =
  'allow-scripts allow-same-origin allow-forms allow-popups allow-modals';

/**
 * Methods that are restricted from iframe context for security
 */
export const RESTRICTED_IFRAME_METHODS = [
  'registerHook',
  'registerHeaderButton',
  'registerMenuEntry',
  'registerShortcut',
  'registerSidePanelButton',
  'onMessage',
  'executeNodeScript',
];

/**
 * Creates a simple PluginAPI script with predefined methods (compatible with plugin-index.component)
 * This approach directly exposes specific methods for better compatibility.
 *
 * @param config - Configuration containing plugin metadata and bridge service
 * @returns JavaScript code as a string to be injected into the iframe
 */
export const createSimplePluginApiScript = (config: PluginIframeConfig): string => {
  return `
    <script>
      // Plugin API for iframe communication
      (function() {
        let callId = 0;
        const pendingCalls = new Map();

        // Listen for responses from parent window
        window.addEventListener('message', function(event) {
          if (event.data && event.data.type === 'PLUGIN_API_RESPONSE') {
            const { callId: responseCallId, result } = event.data;
            const resolver = pendingCalls.get(responseCallId);
            if (resolver) {
              pendingCalls.delete(responseCallId);
              resolver.resolve(result);
            }
          } else if (event.data && event.data.type === 'PLUGIN_API_ERROR') {
            const { callId: responseCallId, error } = event.data;
            const resolver = pendingCalls.get(responseCallId);
            if (resolver) {
              pendingCalls.delete(responseCallId);
              resolver.reject(new Error(error));
            }
          }
        });

        function makeApiCall(method, args) {
          return new Promise((resolve, reject) => {
            const currentCallId = ++callId;
            pendingCalls.set(currentCallId, { resolve, reject });

            // Use '*' for data URLs which have null origin
            const targetOrigin = window.location.origin === 'null' ? '*' : window.location.origin;
            window.parent.postMessage({
              type: 'PLUGIN_API_CALL',
              method: method,
              args: args || [],
              callId: currentCallId
            }, targetOrigin);

            // Timeout after 30 seconds
            setTimeout(() => {
              if (pendingCalls.has(currentCallId)) {
                pendingCalls.delete(currentCallId);
                reject(new Error('API call timeout'));
              }
            }, 30000);
          });
        }

        // Expose Plugin API to iframe
        window.PluginAPI = {
          showSnack: (snackCfg) => makeApiCall('showSnack', [snackCfg]),
          notify: (notifyCfg) => makeApiCall('notify', [notifyCfg]),
          openDialog: (dialogCfg) => makeApiCall('openDialog', [dialogCfg]),
          getTasks: () => makeApiCall('getTasks', []),
          getArchivedTasks: () => makeApiCall('getArchivedTasks', []),
          getCurrentContextTasks: () => makeApiCall('getCurrentContextTasks', []),
          updateTask: (taskId, updates) => makeApiCall('updateTask', [taskId, updates]),
          addTask: (taskData) => makeApiCall('addTask', [taskData]),
          getAllProjects: () => makeApiCall('getAllProjects', []),
          addProject: (projectData) => makeApiCall('addProject', [projectData]),
          updateProject: (projectId, updates) => makeApiCall('updateProject', [projectId, updates]),
          getAllTags: () => makeApiCall('getAllTags', []),
          addTag: (tagData) => makeApiCall('addTag', [tagData]),
          updateTag: (tagId, updates) => makeApiCall('updateTag', [tagId, updates]),
          persistDataSynced: (dataStr) => makeApiCall('persistDataSynced', [dataStr]),
          loadPersistedData: () => makeApiCall('loadPersistedData', []),
          loadSyncedData: () => makeApiCall('loadSyncedData', []),${
            config.enableIndexView
              ? `
          showIndexHtmlAsView: () => makeApiCall('showIndexHtmlAsView', []),`
              : ''
          }
        };

        console.log('Plugin API injected successfully');
      })();
    </script>
  `;
};

/**
 * Creates a dynamic PluginAPI script using reflection (original approach)
 * This script sets up the global PluginAPI object that plugins use to interact with the app.
 *
 * @param config - Configuration containing plugin metadata and bridge service
 * @returns JavaScript code as a string to be injected into the iframe
 */
export const createDynamicPluginApiScript = (config: PluginIframeConfig): string => {
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
                  try {
                    // Use '*' for data URLs which have null origin
                    const targetOrigin = window.location.origin === 'null' ? '*' : window.location.origin;
                    window.parent.postMessage(message, targetOrigin);
                  } catch (e) {
                    window.removeEventListener('message', handleResponse);
                    reject(new Error('Failed to communicate with parent window: ' + e.message));
                  }
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
            ${
              config.enableIndexView
                ? "console.warn('showIndexHtmlAsView is not available in dynamic API mode');"
                : "console.warn('showIndexHtmlAsView is not available for side panel plugins');"
            }
          };
          
          // Add alias for backward compatibility
          this.loadSyncedData = this.loadPersistedData;
          
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
        try {
          // Use '*' for data URLs which have null origin
          const targetOrigin = window.location.origin === 'null' ? '*' : window.location.origin;
          window.parent.postMessage({ type: 'plugin-ready', pluginId: '${config.pluginId}' }, targetOrigin);
        } catch (e) {
          console.error('Failed to notify parent window that plugin is ready:', e);
        }
      })();
    </script>
  `;
};

/**
 * Creates the appropriate PluginAPI script based on configuration
 * @param config - Configuration containing plugin metadata and preferences
 * @returns JavaScript code as a string to be injected into the iframe
 */
export const createPluginApiScript = (config: PluginIframeConfig): string => {
  const apiStyle = config.apiStyle || 'dynamic';
  return apiStyle === 'simple'
    ? createSimplePluginApiScript(config)
    : createDynamicPluginApiScript(config);
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

  // Choose injection point based on API style
  let modifiedHtml = config.indexHtml;

  if (config.apiStyle === 'simple') {
    // For simple API style, inject before closing body tag (like plugin-index.component)
    const bodyCloseIndex = modifiedHtml.toLowerCase().lastIndexOf('</body>');
    if (bodyCloseIndex !== -1) {
      modifiedHtml =
        modifiedHtml.slice(0, bodyCloseIndex) +
        apiScript +
        modifiedHtml.slice(bodyCloseIndex);
    } else {
      // Fallback: append at the end
      modifiedHtml = modifiedHtml + apiScript;
    }
  } else {
    // For dynamic API style, inject in head to ensure it's available before body scripts run
    const headCloseIndex = modifiedHtml.toLowerCase().lastIndexOf('</head>');
    if (headCloseIndex !== -1) {
      // Insert before closing head tag
      modifiedHtml =
        modifiedHtml.slice(0, headCloseIndex) +
        apiScript +
        modifiedHtml.slice(headCloseIndex);
    } else {
      // If no head tag, try to insert before body
      const bodyOpenIndex = modifiedHtml.toLowerCase().indexOf('<body');
      if (bodyOpenIndex !== -1) {
        modifiedHtml =
          modifiedHtml.slice(0, bodyOpenIndex) +
          apiScript +
          modifiedHtml.slice(bodyOpenIndex);
      } else {
        // Last resort: prepend to the entire document
        modifiedHtml = apiScript + modifiedHtml;
      }
    }
  }

  // Create data URL
  const blobText = btoa(unescape(encodeURIComponent(modifiedHtml)));
  return `data:text/html;base64,${blobText}`;
};

/**
 * Validates message origin for iframe communication
 * @param event - MessageEvent to validate
 * @returns true if origin is valid
 */
export const validateMessageOrigin = (event: MessageEvent): boolean => {
  // Security: Verify origin for data URLs
  // In development, localhost origins are common due to dev server
  const isDevOrigin = event.origin.startsWith('http://localhost:');
  const isDataUrlOrigin = event.origin === 'null' || event.origin.startsWith('data:');

  return isDataUrlOrigin || isDevOrigin || event.origin === window.location.origin;
};

/**
 * Handles plugin API calls with unified logic for both simple and dynamic approaches
 * @param config - Plugin iframe configuration
 * @param event - MessageEvent containing the API call
 * @param data - Parsed message data
 */
export const handlePluginApiCall = async (
  config: PluginIframeConfig,
  event: MessageEvent,
  data: any,
): Promise<void> => {
  // Validate message structure for both simple and dynamic approaches
  const callId = data.callId || data.messageId;
  const method = data.method;
  const args = data.args || [];

  if (!method || !Array.isArray(args) || !callId) {
    console.error('Invalid plugin API call structure:', data);
    return;
  }

  try {
    // Set the plugin context for secure API calls
    config.pluginBridge._setCurrentPlugin(config.pluginId);

    let result: unknown;
    let methodName = String(method);

    // Map some method names for compatibility
    if (methodName === 'loadSyncedData') {
      methodName = 'loadPersistedData';
    }

    // Security: Check for restricted methods
    if (RESTRICTED_IFRAME_METHODS.includes(methodName)) {
      throw new Error(
        `Method '${methodName}' is not allowed from iframe context. This method can only be called from the main plugin code.`,
      );
    }

    // Map API method calls to bridge methods
    switch (methodName) {
      case 'showSnack':
        result = config.pluginBridge.showSnack(args[0] as SnackCfg);
        break;
      case 'notify':
        result = await config.pluginBridge.notify(args[0] as NotifyCfg);
        break;
      case 'openDialog':
        result = await config.pluginBridge.openDialog(args[0] as DialogCfg);
        break;
      case 'getTasks':
        result = await config.pluginBridge.getTasks();
        break;
      case 'getArchivedTasks':
        result = await config.pluginBridge.getArchivedTasks();
        break;
      case 'getCurrentContextTasks':
        result = await config.pluginBridge.getCurrentContextTasks();
        break;
      case 'updateTask':
        result = await config.pluginBridge.updateTask(
          args[0] as string,
          args[1] as Partial<TaskCopy>,
        );
        break;
      case 'addTask':
        result = await config.pluginBridge.addTask(args[0] as PluginCreateTaskData);
        break;
      case 'getAllProjects':
        result = await config.pluginBridge.getAllProjects();
        break;
      case 'addProject':
        result = await config.pluginBridge.addProject(args[0] as Partial<ProjectCopy>);
        break;
      case 'updateProject':
        result = await config.pluginBridge.updateProject(
          args[0] as string,
          args[1] as Partial<ProjectCopy>,
        );
        break;
      case 'getAllTags':
        result = await config.pluginBridge.getAllTags();
        break;
      case 'addTag':
        result = await config.pluginBridge.addTag(args[0] as Partial<TagCopy>);
        break;
      case 'updateTag':
        result = await config.pluginBridge.updateTag(
          args[0] as string,
          args[1] as Partial<TagCopy>,
        );
        break;
      case 'persistDataSynced':
        result = await config.pluginBridge.persistDataSynced(args[0] as string);
        break;
      case 'loadPersistedData':
        result = await config.pluginBridge.loadPersistedData();
        break;
      case 'showIndexHtmlAsView':
        if (config.enableIndexView) {
          result = config.pluginBridge.showIndexHtmlAsView();
        } else {
          throw new Error('showIndexHtmlAsView is not available for side panel plugins');
        }
        break;
      default:
        throw new Error(`Unknown API method: ${methodName}`);
    }

    // Send result back to iframe with appropriate response type
    if (event.source && 'postMessage' in event.source) {
      try {
        const targetOrigin = event.origin === 'null' ? '*' : event.origin;
        const responseType =
          data.type === 'PLUGIN_API_CALL' ? 'PLUGIN_API_RESPONSE' : 'plugin-api-response';
        const responseData =
          data.type === 'PLUGIN_API_CALL'
            ? { type: responseType, callId, result }
            : { type: responseType, messageId: callId, result };

        (event.source as Window).postMessage(responseData, targetOrigin);
      } catch (e) {
        console.error('Failed to post message to iframe:', e);
      }
    }
  } catch (error) {
    // Send error back to iframe
    console.error(`Plugin API call failed for ${method}:`, error);
    if (event.source && 'postMessage' in event.source) {
      try {
        const targetOrigin = event.origin === 'null' ? '*' : event.origin;
        const errorType =
          data.type === 'PLUGIN_API_CALL' ? 'PLUGIN_API_ERROR' : 'plugin-api-error';
        const errorData =
          data.type === 'PLUGIN_API_CALL'
            ? {
                type: errorType,
                callId,
                error: error instanceof Error ? error.message : 'Unknown error',
              }
            : {
                type: errorType,
                messageId: callId,
                error: error instanceof Error ? error.message : 'Unknown error',
              };

        (event.source as Window).postMessage(errorData, targetOrigin);
      } catch (e) {
        console.error('Failed to post error message to iframe:', e);
      }
    }
  }
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
    // Validate origin
    if (!validateMessageOrigin(event)) {
      console.warn('Received message from unexpected origin:', event.origin);
      return;
    }

    const data = event.data;
    if (!data || typeof data !== 'object' || data === null) {
      return;
    }

    // Handle plugin API calls (both PLUGIN_API_CALL and plugin-api-call)
    if (
      'type' in data &&
      (data.type === 'PLUGIN_API_CALL' || data.type === 'plugin-api-call') &&
      ('messageId' in data || 'callId' in data)
    ) {
      await handlePluginApiCall(config, event, data);
    }

    // Handle plugin ready event
    if (
      'type' in data &&
      data.type === 'plugin-ready' &&
      'pluginId' in data &&
      data.pluginId === config.pluginId
    ) {
      console.log(`Plugin ${config.pluginId} iframe is ready`);
      return;
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
        if (data.messageId && event.source && 'postMessage' in event.source) {
          const targetOrigin = event.origin === 'null' ? '*' : event.origin;
          (event.source as Window).postMessage(
            {
              type: 'PLUGIN_MESSAGE_RESPONSE',
              messageId: data.messageId,
              result,
            },
            targetOrigin,
          );
        }
      } catch (error) {
        // Send error back to iframe if messageId was provided
        if (data.messageId && event.source && 'postMessage' in event.source) {
          const targetOrigin = event.origin === 'null' ? '*' : event.origin;
          (event.source as Window).postMessage(
            {
              type: 'PLUGIN_MESSAGE_RESPONSE',
              messageId: data.messageId,
              error: error instanceof Error ? error.message : String(error),
            },
            targetOrigin,
          );
        }
      }
      return;
    }

    // Call custom message handler if provided
    if (config.onMessage) {
      config.onMessage(data);
    }
  };
};

/**
 * Creates a complete iframe setup with URL and message handler
 * This is a convenience function that combines URL creation and message handling
 *
 * @param config - Configuration for the plugin iframe
 * @returns Object containing the iframe URL and message handler
 */
export const createPluginIframeSetup = (
  config: PluginIframeConfig,
): {
  iframeUrl: string;
  messageHandler: (event: MessageEvent) => Promise<void>;
  sandbox: string;
} => {
  const iframeUrl = createPluginIframeUrl(config);
  const messageHandler = createIframeMessageHandler(config);

  return {
    iframeUrl,
    messageHandler,
    sandbox: PLUGIN_IFRAME_SANDBOX,
  };
};

/**
 * Convenience function for creating plugin iframe config for full-page plugins
 * @param pluginId - Plugin identifier
 * @param manifest - Plugin manifest
 * @param indexHtml - Plugin HTML content
 * @param baseCfg - Base configuration
 * @param pluginBridge - Bridge service
 * @returns Configuration for full-page plugin iframe
 */
export const createFullPagePluginConfig = (
  pluginId: string,
  manifest: PluginManifest,
  indexHtml: string,
  baseCfg: PluginBaseCfg,
  pluginBridge: PluginBridgeService,
): PluginIframeConfig => ({
  pluginId,
  manifest,
  indexHtml,
  baseCfg,
  pluginBridge,
  apiStyle: 'simple',
  enableIndexView: true,
});

/**
 * Convenience function for creating plugin iframe config for side panel plugins
 * @param pluginId - Plugin identifier
 * @param manifest - Plugin manifest
 * @param indexHtml - Plugin HTML content
 * @param baseCfg - Base configuration
 * @param pluginBridge - Bridge service
 * @returns Configuration for side panel plugin iframe
 */
export const createSidePanelPluginConfig = (
  pluginId: string,
  manifest: PluginManifest,
  indexHtml: string,
  baseCfg: PluginBaseCfg,
  pluginBridge: PluginBridgeService,
): PluginIframeConfig => ({
  pluginId,
  manifest,
  indexHtml,
  baseCfg,
  pluginBridge,
  apiStyle: 'dynamic',
  enableIndexView: false,
});
