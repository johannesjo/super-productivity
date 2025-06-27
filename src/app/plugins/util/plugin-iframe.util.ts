import { PluginBridgeService } from '../plugin-bridge.service';
import { PluginBaseCfg, PluginManifest } from '../plugin-api.model';

/**
 * Simplified plugin iframe utilities following KISS principles.
 * One way to do things, no complex options.
 */

export interface PluginIframeConfig {
  pluginId: string;
  manifest: PluginManifest;
  indexHtml: string;
  baseCfg: PluginBaseCfg;
  pluginBridge: PluginBridgeService;
}

// Simple sandbox - allow what plugins need
export const PLUGIN_IFRAME_SANDBOX =
  'allow-scripts allow-same-origin allow-forms allow-popups allow-modals';

/**
 * Create CSS injection for plugins - KISS approach
 */
export const createPluginCssInjection = (): string => {
  const isDarkTheme = document.body.classList.contains('isDarkTheme');
  // CSS variables are defined on body, not :root!
  const computedStyle = getComputedStyle(document.body);

  // Just get the essential theme variables we need
  const getVar = (name: string): string => {
    return computedStyle.getPropertyValue(name).trim();
  };

  return `
    <style id="injected-theme-vars">
      :root {
        --theme-bg: ${getVar('--theme-bg')};
        --theme-bg-darker: ${getVar('--theme-bg-darker')};
        --theme-text-color: ${getVar('--theme-text-color')};
        --theme-text-color-less-intense: ${getVar('--theme-text-color-less-intense')};
        --theme-text-color-muted: ${getVar('--theme-text-color-muted')};
        --theme-card-bg: ${getVar('--theme-card-bg')};
        --theme-divider-color: ${getVar('--theme-divider-color')};
        --theme-extra-border-color: ${getVar('--theme-extra-border-color')};
        --theme-select-hover-bg: ${getVar('--theme-select-hover-bg')};
        --theme-text-color-muted: ${getVar('--theme-text-color-muted')};
        --c-primary: ${getVar('--c-primary')};
        --c-accent: ${getVar('--c-accent')};
        --c-warn: ${getVar('--c-warn')};
        --color-success: ${getVar('--color-success')};
        --color-danger: ${getVar('--color-danger')};
        --color-warning: ${getVar('--color-warning')};
        --is-dark-theme: ${isDarkTheme ? '1' : '0'};
        --theme-scrollbar-thumb: ${getVar('--theme-scrollbar-thumb')};
        --theme-scrollbar-thumb-hover: ${getVar('--theme-scrollbar-thumb-hover')};
        --theme-scrollbar-track: ${getVar('--theme-scrollbar-track')};
      }

      body {
        background: transparent;
        color: var(--theme-text-color);
      }
      
      /* Custom scrollbar styles for plugins */
      :root {
        scrollbar-color: var(--theme-scrollbar-thumb) var(--theme-scrollbar-track);
        scrollbar-width: thin;
      }
      
      ::-webkit-scrollbar {
        width: 4px;
        height: 4px;
      }
      
      /* Track */
      ::-webkit-scrollbar-track {
        background: var(--theme-scrollbar-track);
        border-radius: 4px;
      }
      
      /* Handle */
      ::-webkit-scrollbar-thumb {
        background: var(--theme-scrollbar-thumb);
        border-radius: 16px;
      }
      
      /* Handle on hover */
      ::-webkit-scrollbar-thumb:hover {
        background: var(--theme-scrollbar-thumb-hover);
      }
    </style>
  `;
};

/**
 * Create the plugin API script - simple and direct
 */
export const createPluginApiScript = (config: PluginIframeConfig): string => {
  return `
    <script>
      (function() {
        let callId = 0;
        const pendingCalls = new Map();
        const dialogButtonHandlers = new Map();
        const hookHandlers = new Map(); // Store hook handlers by hook type

        // Handle responses from parent
        window.addEventListener('message', function(event) {
          const data = event.data;
          if (data?.type === 'PLUGIN_API_RESPONSE' && data.callId) {
            const resolver = pendingCalls.get(data.callId);
            if (resolver) {
              pendingCalls.delete(data.callId);
              resolver.resolve(data.result);
            }
          } else if (data?.type === 'PLUGIN_API_ERROR' && data.callId) {
            const resolver = pendingCalls.get(data.callId);
            if (resolver) {
              pendingCalls.delete(data.callId);
              resolver.reject(new Error(data.error));
            }
          } else if (data?.type === 'PLUGIN_DIALOG_BUTTON_CLICK') {
            // Handle dialog button clicks
            const key = data.dialogCallId + ':' + data.buttonIndex;
            const handler = dialogButtonHandlers.get(key);
            if (handler) {
              try {
                const result = handler();
                window.parent.postMessage({
                  type: 'PLUGIN_DIALOG_BUTTON_RESPONSE',
                  dialogCallId: data.dialogCallId,
                  buttonIndex: data.buttonIndex,
                  result: result
                }, '*');
              } catch (error) {
                window.parent.postMessage({
                  type: 'PLUGIN_DIALOG_BUTTON_RESPONSE',
                  dialogCallId: data.dialogCallId,
                  buttonIndex: data.buttonIndex,
                  error: error.message
                }, '*');
              }
            }
          } else if (data?.type === 'PLUGIN_HOOK_EVENT') {
            // Handle hook events
            const handlers = hookHandlers.get(data.hook);
            if (handlers && handlers.length > 0) {
              handlers.forEach(handler => {
                try {
                  handler(data.payload);
                } catch (error) {
                  console.error('Hook handler error:', error);
                }
              });
            }
          }
        });

        // Simple API call function
        function callApi(method, args) {
          return new Promise((resolve, reject) => {
            const id = ++callId;
            pendingCalls.set(id, { resolve, reject });

            // Special handling for openDialog to store button handlers
            let processedArgs = args;
            if (method === 'openDialog' && args && args[0] && args[0].buttons) {
              processedArgs = [...args];
              processedArgs[0] = {
                ...args[0],
                buttons: args[0].buttons.map((button, index) => {
                  if (button.onClick) {
                    // Store the handler
                    const key = id + ':' + index;
                    dialogButtonHandlers.set(key, button.onClick);
                    // Remove onClick from serialized data
                    const { onClick, ...buttonWithoutHandler } = button;
                    return buttonWithoutHandler;
                  }
                  return button;
                })
              };
            }

            // Special handling for registerHook to store handlers locally
            if (method === 'registerHook' && args && args.length >= 2) {
              const [hook, handler] = args;
              if (typeof handler === 'function') {
                // Store handler locally
                if (!hookHandlers.has(hook)) {
                  hookHandlers.set(hook, []);
                }
                hookHandlers.get(hook).push(handler);

                // Pass a placeholder to parent - parent will send events back to us
                processedArgs = [hook, 'IFRAME_HANDLER'];
              } else {
                processedArgs = args;
              }
            }

            window.parent.postMessage({
              type: 'PLUGIN_API_CALL',
              method: method,
              args: processedArgs || [],
              callId: id
            }, '*');

            // Timeout after 30 seconds
            setTimeout(() => {
              if (pendingCalls.has(id)) {
                pendingCalls.delete(id);
                reject(new Error('API call timeout'));
              }
            }, 30000);
          });
        }

        // Create the PluginAPI object with all methods
        window.PluginAPI = {
          cfg: ${JSON.stringify(config.baseCfg)},

          // Add Hooks enum
          Hooks: {
            TASK_COMPLETE: 'taskComplete',
            TASK_UPDATE: 'taskUpdate',
            TASK_DELETE: 'taskDelete',
            CURRENT_TASK_CHANGE: 'currentTaskChange',
            FINISH_DAY: 'finishDay',
            LANGUAGE_CHANGE: 'languageChange',
            PERSISTED_DATA_UPDATE: 'persistedDataUpdate',
            ACTION: 'action'
          },

          // Task methods
          getTasks: () => callApi('getTasks'),
          getArchivedTasks: () => callApi('getArchivedTasks'),
          getCurrentContextTasks: () => callApi('getCurrentContextTasks'),
          updateTask: (taskId, updates) => callApi('updateTask', [taskId, updates]),
          addTask: (taskData) => callApi('addTask', [taskData]),

          // Project methods
          getAllProjects: () => callApi('getAllProjects'),
          addProject: (projectData) => callApi('addProject', [projectData]),
          updateProject: (projectId, updates) => callApi('updateProject', [projectId, updates]),

          // Tag methods
          getAllTags: () => callApi('getAllTags'),
          addTag: (tagData) => callApi('addTag', [tagData]),
          updateTag: (tagId, updates) => callApi('updateTag', [tagId, updates]),

          // Task ordering
          reorderTasks: (taskIds, contextId, contextType) => callApi('reorderTasks', [taskIds, contextId, contextType]),

          // UI methods
          showSnack: (cfg) => callApi('showSnack', [cfg]),
          notify: (cfg) => callApi('notify', [cfg]),
          openDialog: (cfg) => callApi('openDialog', [cfg]),
          showIndexHtmlAsView: () => callApi('showIndexHtmlAsView'),
          showIndexHtmlInSidePanel: () => callApi('showIndexHtmlInSidePanel'),

          // Persistence methods
          persistDataSynced: (data) => callApi('persistDataSynced', [data]),
          loadPersistedData: () => callApi('loadPersistedData'),
          loadSyncedData: () => callApi('loadPersistedData'), // Alias

          // Registration methods
          registerHook: (hook, handler) => callApi('registerHook', [hook, handler]),
          registerHeaderButton: (cfg) => callApi('registerHeaderButton', [cfg]),
          registerMenuEntry: (cfg) => callApi('registerMenuEntry', [cfg]),
          registerShortcut: (cfg) => callApi('registerShortcut', [cfg]),
          registerSidePanelButton: (cfg) => callApi('registerSidePanelButton', [cfg]),

          // Node execution (if available)
          executeNodeScript: (request) => callApi('executeNodeScript', [request]),

          // Action dispatch
          dispatchAction: (action) => callApi('dispatchAction', [action]),

          // Message handling
          onMessage: (handler) => {
            // Store the handler and set up message listener
            window.__pluginMessageHandler = handler;
            window.addEventListener('message', async (event) => {
              if (event.data?.type === 'PLUGIN_MESSAGE' && window.__pluginMessageHandler) {
                try {
                  const result = await window.__pluginMessageHandler(event.data.message);
                  event.source?.postMessage({
                    type: 'PLUGIN_MESSAGE_RESPONSE',
                    messageId: event.data.messageId,
                    result
                  }, '*');
                } catch (error) {
                  event.source?.postMessage({
                    type: 'PLUGIN_MESSAGE_ERROR',
                    messageId: event.data.messageId,
                    error: error instanceof Error ? error.message : 'Unknown error'
                  }, '*');
                }
              }
            });
          }
        };

        // Notify parent that plugin is ready
        window.parent.postMessage({
          type: 'plugin-ready',
          pluginId: '${config.pluginId}'
        }, '*');
      })();
    </script>
  `;
};

/**
 * Create iframe URL with injected API
 */
export const createPluginIframeUrl = (config: PluginIframeConfig): string => {
  const apiScript = createPluginApiScript(config);
  const cssInjection = createPluginCssInjection();

  // Inject CSS in head
  let html = config.indexHtml;
  const headEnd = html.toLowerCase().lastIndexOf('</head>');

  if (headEnd !== -1) {
    html = html.slice(0, headEnd) + cssInjection + html.slice(headEnd);
  } else {
    // If no head tag, inject at beginning
    html = cssInjection + html;
  }

  // Inject API script before closing body tag
  const bodyEnd = html.toLowerCase().lastIndexOf('</body>');

  if (bodyEnd !== -1) {
    html = html.slice(0, bodyEnd) + apiScript + html.slice(bodyEnd);
  } else {
    html = html + apiScript;
  }

  // Convert to data URL
  return 'data:text/html;base64,' + btoa(unescape(encodeURIComponent(html)));
};

/**
 * Handle plugin iframe messages - simple switch statement
 */
export const handlePluginMessage = async (
  event: MessageEvent,
  config: PluginIframeConfig,
): Promise<void> => {
  const { data } = event;

  if (!data || typeof data !== 'object') return;

  // Handle API calls
  if (data.type === 'PLUGIN_API_CALL' && data.callId) {
    const { method, args, callId } = data;

    try {
      // Set plugin context
      config.pluginBridge._setCurrentPlugin(config.pluginId, config.manifest);

      // For iframe plugins, we need to handle API calls differently
      // Some methods need special handling because the bridge methods have different signatures

      // For registerHook, we need to add the pluginId parameter when calling the bridge
      if (method === 'registerHook') {
        const bridge = config.pluginBridge as any;
        // Special handling for registerHook - it needs pluginId as first parameter
        if (args.length >= 2) {
          const [hook, handlerPlaceholder] = args;
          console.log('Plugin iframe registerHook:', {
            hook,
            handlerPlaceholder,
            pluginId: config.pluginId,
          });

          let result;
          // If it's an iframe handler, create a proxy that sends events to iframe
          if (handlerPlaceholder === 'IFRAME_HANDLER') {
            const handler = (payload: any): void => {
              // Send hook event to iframe
              event.source?.postMessage(
                {
                  type: 'PLUGIN_HOOK_EVENT',
                  hook: hook,
                  payload: payload,
                },
                '*' as any,
              );
            };
            result = await bridge.registerHook(config.pluginId, hook, handler);
          } else {
            // Legacy string handler support
            const handler = new Function('return ' + handlerPlaceholder)();
            result = await bridge.registerHook(config.pluginId, hook, handler);
          }
          event.source?.postMessage(
            {
              type: 'PLUGIN_API_RESPONSE',
              callId,
              result,
            },
            '*' as any,
          );
          return;
        }
      }

      // For other methods, call them on the bridge
      const bridge = config.pluginBridge as any;
      if (typeof bridge[method] !== 'function') {
        throw new Error(`Unknown API method: ${method}`);
      }

      // Special handling for openDialog with button handlers
      if (method === 'openDialog' && args.length >= 1) {
        // Special handling for dialog with button onClick handlers
        const dialogCfg = args[0];
        if (dialogCfg.buttons) {
          // Create a mapping of button indices to their handlers
          const buttonHandlers = new Map();
          dialogCfg.buttons = dialogCfg.buttons.map((button: any, index: number) => {
            if (button.onClick) {
              buttonHandlers.set(index, button.onClick);
              // Replace function with a proxy that sends message back to iframe
              return {
                ...button,
                onClick: async () => {
                  // Send message to iframe to execute the button handler
                  event.source?.postMessage(
                    {
                      type: 'PLUGIN_DIALOG_BUTTON_CLICK',
                      buttonIndex: index,
                      dialogCallId: callId,
                    },
                    '*' as any,
                  );
                  // Wait for response
                  return new Promise((resolve) => {
                    const handleResponse = (e: MessageEvent): void => {
                      if (
                        e.data?.type === 'PLUGIN_DIALOG_BUTTON_RESPONSE' &&
                        e.data?.dialogCallId === callId &&
                        e.data?.buttonIndex === index
                      ) {
                        window.removeEventListener('message', handleResponse);
                        resolve(e.data.result);
                      }
                    };
                    window.addEventListener('message', handleResponse);
                  });
                },
              };
            }
            return button;
          });
        }
        const result = await bridge[method](dialogCfg);
        event.source?.postMessage(
          {
            type: 'PLUGIN_API_RESPONSE',
            callId,
            result,
          },
          '*' as any,
        );
      } else {
        // Normal method call
        const result = await bridge[method](...(args || []));
        event.source?.postMessage(
          {
            type: 'PLUGIN_API_RESPONSE',
            callId,
            result,
          },
          '*' as any,
        );
      }
    } catch (error) {
      event.source?.postMessage(
        {
          type: 'PLUGIN_API_ERROR',
          callId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        '*' as any,
      );
    }
  }

  // Handle plugin message forwarding
  if (data.type === 'PLUGIN_MESSAGE' && data.messageId) {
    try {
      // Forward the message to the plugin using the bridge
      const result = await config.pluginBridge.sendMessageToPlugin(
        config.pluginId,
        data.message,
      );

      // Send the response back to the iframe
      event.source?.postMessage(
        {
          type: 'PLUGIN_MESSAGE_RESPONSE',
          messageId: data.messageId,
          result,
        },
        '*' as any,
      );
    } catch (error) {
      event.source?.postMessage(
        {
          type: 'PLUGIN_MESSAGE_ERROR',
          messageId: data.messageId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        '*' as any,
      );
    }
  }

  // Handle plugin ready
  if (data.type === 'plugin-ready' && data.pluginId === config.pluginId) {
    console.log(`Plugin ${config.pluginId} is ready`);
  }
};
