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
 * Create the plugin API script - simple and direct
 */
export const createPluginApiScript = (config: PluginIframeConfig): string => {
  return `
    <script>
      (function() {
        let callId = 0;
        const pendingCalls = new Map();

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
          }
        });

        // Simple API call function
        function callApi(method, args) {
          return new Promise((resolve, reject) => {
            const id = ++callId;
            pendingCalls.set(id, { resolve, reject });
            
            window.parent.postMessage({
              type: 'PLUGIN_API_CALL',
              method: method,
              args: args || [],
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

  // Inject before closing body tag
  let html = config.indexHtml;
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
      config.pluginBridge._setCurrentPlugin(config.pluginId);

      // Call the method on the bridge
      const bridge = config.pluginBridge as any;
      if (typeof bridge[method] !== 'function') {
        throw new Error(`Unknown API method: ${method}`);
      }

      // Special handling for registration methods that have handlers
      if (method === 'registerHook' && args.length >= 2) {
        // Convert handler function to a callable
        const [hook, handlerStr] = args;
        const handler = new Function('return ' + handlerStr)();
        const result = await bridge[method](hook, handler);
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

  // Handle plugin ready
  if (data.type === 'plugin-ready' && data.pluginId === config.pluginId) {
    console.log(`Plugin ${config.pluginId} is ready`);
  }
};
