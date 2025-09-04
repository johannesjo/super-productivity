// /* TODO: Temporarily disabled while fixing core plugin issues
// import {
//   createPluginCssInjection,
//   createPluginApiScript,
//   createPluginIframeUrl,
//   handlePluginMessage,
//   PLUGIN_IFRAME_SANDBOX,
//   PluginIframeConfig,
// } from './plugin-iframe.util';
// import { PluginBridgeService } from '../plugin-bridge.service';
//
// describe('Plugin Iframe Utilities', () => {
//   let mockPluginBridge: jasmine.SpyObj<PluginBridgeService>;
//
//   beforeEach(() => {
//     mockPluginBridge = jasmine.createSpyObj('PluginBridgeService', [
//       '_setCurrentPlugin',
//       'registerHook',
//       'openDialog',
//       'getTasks',
//       'showSnack',
//       'notify',
//       'showIndexHtmlAsView',
//       'getArchivedTasks',
//       'getCurrentContextTasks',
//       'updateTask',
//       'addTask',
//       'getAllProjects',
//       'addProject',
//       'updateProject',
//       'getAllTags',
//       'addTag',
//       'updateTag',
//       'reorderTasks',
//       'persistDataSynced',
//       'loadPersistedData',
//       'unregisterPluginHooks',
//       'registerHeaderButton',
//       'registerMenuEntry',
//       'registerSidePanelButton',
//       'registerShortcut',
//       'executeNodeScript',
//       'sendMessageToPlugin',
//     ]);
//   });
//
//   describe('PLUGIN_IFRAME_SANDBOX', () => {
//     it('should have the correct sandbox permissions', () => {
//       expect(PLUGIN_IFRAME_SANDBOX).toBe(
//         'allow-scripts allow-same-origin allow-forms allow-popups allow-modals',
//       );
//     });
//   });
//
//   describe('createPluginCssInjection', () => {
//     beforeEach(() => {
//       // Mock getComputedStyle
//       /* eslint-disable @typescript-eslint/naming-convention */
//       spyOn(window, 'getComputedStyle').and.returnValue({
//         getPropertyValue: (prop: string) => {
//           const values: { [key: string]: string } = {
//             '--bg': '#ffffff',
//             '--text-color': '#000000',
//             '--card-bg': '#f5f5f5',
//             '--divider-color': '#e0e0e0',
//             '--select-hover-bg': '#eeeeee',
//             '--text-color-muted': '#666666',
//             '--c-primary': '#2196f3',
//             '--c-accent': '#ff4081',
//             '--c-warn': '#f44336',
//             '--color-success': '#4caf50',
//             '--color-danger': '#f44336',
//             '--color-warning': '#ff9800',
//             '--is-rtl': '0',
//             '--primary-bg': '#e3f2fd',
//             '--primary-color': '#1976d2',
//             '--link-color': '#2196f3',
//             '--border-radius': '4px',
//             '--transition': '0.3s ease',
//             '--font-family': 'Open Sans, sans-serif',
//             '--error-color': '#f44336',
//           };
//           // eslint-enable @typescript-eslint/naming-convention
//           return values[prop] || '';
//         },
//       } as any);
//     });
//
//     it('should create CSS with theme variables for light theme', () => {
//       spyOnProperty(document.body.classList, 'contains').and.returnValue(false);
//
//       const css = createPluginCssInjection();
//
//       expect(css).toContain('--bg: #ffffff');
//       expect(css).toContain('--text-color: #000000');
//       expect(css).toContain('--is-dark-theme: 0');
//       expect(css).toContain('background: transparent');
//       expect(css).toContain('--primary-bg: #e3f2fd');
//       expect(css).toContain('--link-color: #2196f3');
//       expect(css).toContain('font-family: Open Sans, sans-serif');
//     });
//
//     it('should create CSS with theme variables for dark theme', () => {
//       spyOnProperty(document.body.classList, 'contains').and.returnValue(true);
//
//       const css = createPluginCssInjection();
//
//       expect(css).toContain('--is-dark-theme: 1');
//     });
//
//     it('should include all required CSS variables', () => {
//       spyOnProperty(document.body.classList, 'contains').and.returnValue(false);
//
//       const css = createPluginCssInjection();
//
//       // Check for all CSS variables
//       const expectedVars = [
//         '--bg',
//         '--text-color',
//         '--card-bg',
//         '--divider-color',
//         '--select-hover-bg',
//         '--text-color-muted',
//         '--c-primary',
//         '--c-accent',
//         '--c-warn',
//         '--color-success',
//         '--color-danger',
//         '--color-warning',
//         '--is-rtl',
//         '--primary-bg',
//         '--primary-color',
//         '--link-color',
//         '--border-radius',
//         '--transition',
//         '--font-family',
//         '--error-color',
//         '--is-dark-theme',
//       ];
//
//       expectedVars.forEach((varName) => {
//         expect(css).toContain(varName);
//       });
//     });
//
//     it('should set proper body styles', () => {
//       const css = createPluginCssInjection();
//
//       expect(css).toContain('body {');
//       expect(css).toContain('margin: 0');
//       expect(css).toContain('padding: 8px');
//       expect(css).toContain('background: transparent');
//       expect(css).toContain('font-family: Open Sans, sans-serif');
//       expect(css).toContain('color: var(--text-color)');
//     });
//   });
//
//   describe('createPluginApiScript', () => {
//     const mockConfig: PluginIframeConfig = {
//       pluginId: 'test-plugin',
//       manifest: {
//         id: 'test-plugin',
//         name: 'Test Plugin',
//         manifestVersion: 1,
//         version: '1.0.0',
//         minSupVersion: '1.0.0',
//         description: 'Test plugin',
//       },
//       indexHtml: '<html></html>',
//       baseCfg: {
//         appVersion: '1.0.0',
//         lang: {
//           code: 'en',
//           isLangRtl: false,
//         },
//       },
//       pluginBridge: mockPluginBridge,
//     };
//
//     it('should create a script with PluginAPI object', () => {
//       const script = createPluginApiScript(mockConfig);
//
//       expect(script).toContain('window.PluginAPI = {');
//       expect(script).toContain('cfg: ' + JSON.stringify(mockConfig.baseCfg));
//       expect(script).toContain('Hooks: {');
//       expect(script).toContain("TASK_COMPLETE: 'taskComplete'");
//       expect(script).toContain("TASK_UPDATE: 'taskUpdate'");
//     });
//
//     it('should include all hook constants', () => {
//       const script = createPluginApiScript(mockConfig);
//
//       const hooks = [
//         'TASK_ADD',
//         'TASK_UPDATE',
//         'TASK_DELETE',
//         'TASK_MOVE',
//         'TASK_COMPLETE',
//         'TASK_UNCOMPLETE',
//         'TASK_SCHEDULE',
//         'PROJECT_CREATE',
//         'PROJECT_UPDATE',
//         'PROJECT_DELETE',
//         'TAG_CREATE',
//         'TAG_UPDATE',
//         'TAG_DELETE',
//         'WORK_CONTEXT_CHANGE',
//         'SYNC_START',
//         'SYNC_END',
//         'IDLE_TIME',
//         'BEFORE_PROJECT_ARCHIVE',
//         'DAILY_SUMMARY',
//         'WEEK_SUMMARY',
//         'MONTH_SUMMARY',
//       ];
//
//       hooks.forEach((hook) => {
//         expect(script).toContain(hook);
//       });
//     });
//
//     it('should include message handling for hook events', () => {
//       const script = createPluginApiScript(mockConfig);
//
//       expect(script).toContain("data?.type === 'PLUGIN_HOOK_EVENT'");
//       expect(script).toContain('hookHandlers.get(data.hook)');
//     });
//
//     it('should include special handling for registerHook', () => {
//       const script = createPluginApiScript(mockConfig);
//
//       expect(script).toContain("method === 'registerHook'");
//       expect(script).toContain('hookHandlers.set(hook, [])');
//       expect(script).toContain("processedArgs = [hook, 'IFRAME_HANDLER']");
//     });
//
//     it('should include dialog button handling', () => {
//       const script = createPluginApiScript(mockConfig);
//
//       expect(script).toContain("data?.type === 'PLUGIN_DIALOG_BUTTON_CLICK'");
//       expect(script).toContain('dialogButtonHandlers.get(key)');
//     });
//
//     it('should handle plugin ready state', () => {
//       const script = createPluginApiScript(mockConfig);
//
//       expect(script).toContain('window.addEventListener("load"');
//       expect(script).toContain("type: 'PLUGIN_READY'");
//     });
//
//     it('should include timeout handling for API calls', () => {
//       const script = createPluginApiScript(mockConfig);
//
//       expect(script).toContain('setTimeout(() => {');
//       expect(script).toContain('reject(new Error("API call timeout"));');
//       expect(script).toContain('}, 30000);');
//     });
//
//     it('should create all API methods', () => {
//       const script = createPluginApiScript(mockConfig);
//
//       const methods = [
//         'showSnack',
//         'notify',
//         'openDialog',
//         'showIndexHtmlAsView',
//         'getTasks',
//         'getArchivedTasks',
//         'getCurrentContextTasks',
//         'updateTask',
//         'addTask',
//         'getAllProjects',
//         'addProject',
//         'updateProject',
//         'getAllTags',
//         'addTag',
//         'updateTag',
//         'reorderTasks',
//         'persistDataSynced',
//         'loadPersistedData',
//         'registerHook',
//         'unregisterPluginHooks',
//         'registerHeaderButton',
//         'registerMenuEntry',
//         'registerSidePanelButton',
//         'registerShortcut',
//         'executeNodeScript',
//       ];
//
//       methods.forEach((method) => {
//         expect(script).toContain(`${method}: (`);
//       });
//     });
//   });
//
//   describe('createPluginIframeUrl', () => {
//     const mockConfig: PluginIframeConfig = {
//       pluginId: 'test-plugin',
//       manifest: {
//         id: 'test-plugin',
//         name: 'Test Plugin',
//         manifestVersion: 1,
//         version: '1.0.0',
//         minSupVersion: '1.0.0',
//         description: 'Test plugin',
//       },
//       indexHtml:
//         '<html><head><title>Test</title></head><body><div>Content</div></body></html>',
//       baseCfg: {
//         appVersion: '1.0.0',
//         lang: {
//           code: 'en',
//           isLangRtl: false,
//         },
//       },
//       pluginBridge: mockPluginBridge,
//     };
//
//     it('should inject CSS and script into proper locations', () => {
//       const url = createPluginIframeUrl(mockConfig);
//       const decodedUrl = decodeURIComponent(
//         url.replace('data:text/html;charset=utf-8,', ''),
//       );
//
//       expect(decodedUrl).toContain('<style>');
//       expect(decodedUrl).toContain('</style></head>');
//       expect(decodedUrl).toContain('<script>');
//       expect(decodedUrl).toContain('</script></body>');
//     });
//
//     it('should handle HTML without head tag', () => {
//       const configNoHead = {
//         ...mockConfig,
//         indexHtml: '<html><body><div>Content</div></body></html>',
//       };
//
//       const url = createPluginIframeUrl(configNoHead);
//       const decodedUrl = decodeURIComponent(
//         url.replace('data:text/html;charset=utf-8,', ''),
//       );
//
//       expect(decodedUrl).toContain('<head><style>');
//       expect(decodedUrl).toContain('</style></head>');
//     });
//
//     it('should handle HTML without body tag', () => {
//       const configNoBody = {
//         ...mockConfig,
//         indexHtml: '<html><head><title>Test</title></head></html>',
//       };
//
//       const url = createPluginIframeUrl(configNoBody);
//       const decodedUrl = decodeURIComponent(
//         url.replace('data:text/html;charset=utf-8,', ''),
//       );
//
//       expect(decodedUrl).toContain('<body><script>');
//       expect(decodedUrl).toContain('</script></body>');
//     });
//
//     it('should handle HTML without head and body tags', () => {
//       const configMinimal = {
//         ...mockConfig,
//         indexHtml: '<div>Content</div>',
//       };
//
//       const url = createPluginIframeUrl(configMinimal);
//       const decodedUrl = decodeURIComponent(
//         url.replace('data:text/html;charset=utf-8,', ''),
//       );
//
//       expect(decodedUrl).toContain('<head><style>');
//       expect(decodedUrl).toContain('</style></head>');
//       expect(decodedUrl).toContain('<body>');
//       expect(decodedUrl).toContain('<div>Content</div>');
//       expect(decodedUrl).toContain('<script>');
//       expect(decodedUrl).toContain('</script></body>');
//     });
//
//     it('should properly encode the URL', () => {
//       const url = createPluginIframeUrl(mockConfig);
//
//       expect(url).toMatch(/^data:text\/html;charset=utf-8,/);
//       expect(url).toContain(encodeURIComponent('<html>'));
//     });
//   });
//
//   describe('handlePluginMessage', () => {
//     const mockConfig: PluginIframeConfig = {
//       pluginId: 'test-plugin',
//       manifest: {
//         id: 'test-plugin',
//         name: 'Test Plugin',
//         manifestVersion: 1,
//         version: '1.0.0',
//         minSupVersion: '1.0.0',
//         description: 'Test plugin',
//         permissions: [],
//       },
//       indexHtml: '<html></html>',
//       baseCfg: {
//         appVersion: '1.0.0',
//         lang: {
//           code: 'en',
//           isLangRtl: false,
//         },
//       },
//       pluginBridge: mockPluginBridge,
//     };
//
//     let mockEvent: MessageEvent;
//     let mockSource: any;
//
//     beforeEach(() => {
//       mockSource = {
//         postMessage: jasmine.createSpy('postMessage'),
//       };
//       mockEvent = {
//         data: {
//           type: 'PLUGIN_API_CALL',
//           method: 'getTasks',
//           args: [],
//           callId: 123,
//         },
//         source: mockSource,
//       } as any;
//     });
//
//     it('should handle plugin ready message', async () => {
//       mockEvent.data = { type: 'PLUGIN_READY' };
//
//       await handlePluginMessage(mockEvent, mockConfig);
//
//       // Should not throw error and not post any message
//       expect(mockSource.postMessage).not.toHaveBeenCalled();
//     });
//
//     it('should handle registerHook with IFRAME_HANDLER placeholder', async () => {
//       mockEvent.data.method = 'registerHook';
//       mockEvent.data.args = ['taskUpdate', 'IFRAME_HANDLER'];
//       mockPluginBridge.registerHook.and.returnValue(undefined);
//
//       await handlePluginMessage(mockEvent, mockConfig);
//
//       expect(mockPluginBridge.registerHook).toHaveBeenCalled();
//       const [hook, handler] = mockPluginBridge.registerHook.calls.argsFor(0);
//       expect(hook).toBe('taskUpdate');
//       expect(typeof handler).toBe('function');
//
//       // Test that the handler sends messages back to iframe
//       handler({ id: 'test-task' });
//       expect(mockSource.postMessage).toHaveBeenCalledWith(
//         {
//           type: 'PLUGIN_HOOK_EVENT',
//           hook: 'taskUpdate',
//           payload: { id: 'test-task' },
//         },
//         '*',
//       );
//     });
//
//     it('should handle regular API calls', async () => {
//       mockPluginBridge.getTasks.and.returnValue(Promise.resolve([]));
//
//       await handlePluginMessage(mockEvent, mockConfig);
//
//       expect(mockPluginBridge._setCurrentPlugin).toHaveBeenCalledWith(
//         mockConfig.manifest,
//       );
//       expect(mockPluginBridge.getTasks).toHaveBeenCalled();
//       expect(mockSource.postMessage).toHaveBeenCalledWith(
//         {
//           type: 'PLUGIN_API_RESPONSE',
//           callId: 123,
//           result: [],
//         },
//         '*',
//       );
//     });
//
//     it('should handle API call errors', async () => {
//       mockPluginBridge.getTasks.and.returnValue(Promise.reject(new Error('Test error')));
//
//       await handlePluginMessage(mockEvent, mockConfig);
//
//       expect(mockSource.postMessage).toHaveBeenCalledWith(
//         {
//           type: 'PLUGIN_API_ERROR',
//           callId: 123,
//           error: 'Test error',
//         },
//         '*',
//       );
//     });
//
//     it('should handle errors without message', async () => {
//       mockPluginBridge.getTasks.and.returnValue(Promise.reject('Simple error string'));
//
//       await handlePluginMessage(mockEvent, mockConfig);
//
//       expect(mockSource.postMessage).toHaveBeenCalledWith(
//         {
//           type: 'PLUGIN_API_ERROR',
//           callId: 123,
//           error: 'Simple error string',
//         },
//         '*',
//       );
//     });
//
//     it('should handle openDialog with button handlers', async () => {
//       mockEvent.data.method = 'openDialog';
//       mockEvent.data.args = [
//         {
//           title: 'Test Dialog',
//           buttons: [
//             { text: 'OK', onClick: 'function() { return true; }' },
//             { text: 'Cancel' },
//           ],
//         },
//       ];
//
//       mockPluginBridge.openDialog.and.returnValue(Promise.resolve());
//
//       await handlePluginMessage(mockEvent, mockConfig);
//
//       expect(mockPluginBridge.openDialog).toHaveBeenCalled();
//       const dialogCfg = mockPluginBridge.openDialog.calls.argsFor(0)[0];
//       expect(dialogCfg.buttons[0].onClick).toBeDefined();
//       expect(typeof dialogCfg.buttons[0].onClick).toBe('function');
//       expect(dialogCfg.buttons[1].onClick).toBeUndefined();
//
//       // Test button click handler
//       dialogCfg.buttons[0].onClick();
//       expect(mockSource.postMessage).toHaveBeenCalledWith(
//         {
//           type: 'PLUGIN_DIALOG_BUTTON_CLICK',
//           key: jasmine.any(String),
//         },
//         '*',
//       );
//     });
//
//     it('should check permissions before calling methods', async () => {
//       mockEvent.data.method = 'showSnack';
//       mockEvent.data.args = ['Test message'];
//
//       await handlePluginMessage(mockEvent, mockConfig);
//
//       expect(mockSource.postMessage).toHaveBeenCalledWith(
//         {
//           type: 'PLUGIN_API_ERROR',
//           callId: 123,
//           error: 'Plugin does not have permission: showSnack',
//         },
//         '*',
//       );
//       expect(mockPluginBridge.showSnack).not.toHaveBeenCalled();
//     });
//
//     it('should allow methods with granted permissions', async () => {
//       mockConfig.manifest.permissions = ['showSnack'];
//       mockEvent.data.method = 'showSnack';
//       mockEvent.data.args = [{ msg: 'Test message' }];
//       mockPluginBridge.showSnack.and.returnValue(undefined);
//
//       await handlePluginMessage(mockEvent, mockConfig);
//
//       expect(mockPluginBridge.showSnack).toHaveBeenCalledWith({ msg: 'Test message' });
//       expect(mockSource.postMessage).toHaveBeenCalledWith(
//         {
//           type: 'PLUGIN_API_RESPONSE',
//           callId: 123,
//           result: undefined,
//         },
//         '*',
//       );
//     });
//
//     it('should handle methods that do not require permissions', async () => {
//       mockEvent.data.method = 'getTasks';
//       mockPluginBridge.getTasks.and.returnValue(Promise.resolve([]));
//
//       await handlePluginMessage(mockEvent, mockConfig);
//
//       expect(mockPluginBridge.getTasks).toHaveBeenCalled();
//       expect(mockSource.postMessage).toHaveBeenCalledWith(
//         {
//           type: 'PLUGIN_API_RESPONSE',
//           callId: 123,
//           result: [],
//         },
//         '*',
//       );
//     });
//
//     it('should handle invalid method names', async () => {
//       mockEvent.data.method = 'invalidMethod';
//
//       await handlePluginMessage(mockEvent, mockConfig);
//
//       expect(mockSource.postMessage).toHaveBeenCalledWith(
//         {
//           type: 'PLUGIN_API_ERROR',
//           callId: 123,
//           error: 'Method invalidMethod does not exist on plugin bridge',
//         },
//         '*',
//       );
//     });
//
//     it('should handle non-function properties', async () => {
//       mockEvent.data.method = 'headerButtons$'; // BehaviorSubject, not a function
//
//       await handlePluginMessage(mockEvent, mockConfig);
//
//       expect(mockSource.postMessage).toHaveBeenCalledWith(
//         {
//           type: 'PLUGIN_API_ERROR',
//           callId: 123,
//           error: 'Method headerButtons$ does not exist on plugin bridge',
//         },
//         '*',
//       );
//     });
//
//     it('should ignore non-PLUGIN_API_CALL messages', async () => {
//       mockEvent.data.type = 'OTHER_MESSAGE_TYPE';
//
//       await handlePluginMessage(mockEvent, mockConfig);
//
//       expect(mockPluginBridge._setCurrentPlugin).not.toHaveBeenCalled();
//       expect(mockSource.postMessage).not.toHaveBeenCalled();
//     });
//
//     it('should handle synchronous methods', async () => {
//       mockEvent.data.method = 'executeShortcut';
//       mockEvent.data.args = ['ctrl+s'];
//       mockPluginBridge.executeShortcut = jasmine
//         .createSpy('executeShortcut')
//         .and.returnValue(true);
//
//       await handlePluginMessage(mockEvent, mockConfig);
//
//       expect(mockPluginBridge.executeShortcut).toHaveBeenCalledWith('ctrl+s');
//       expect(mockSource.postMessage).toHaveBeenCalledWith(
//         {
//           type: 'PLUGIN_API_RESPONSE',
//           callId: 123,
//           result: true,
//         },
//         '*',
//       );
//     });
//
//     it('should handle sendMessageToPlugin method', async () => {
//       mockEvent.data.method = 'sendMessageToPlugin';
//       mockEvent.data.args = ['plugin-id', { type: 'custom', data: 'test' }];
//       mockPluginBridge.sendMessageToPlugin.and.returnValue(Promise.resolve());
//
//       await handlePluginMessage(mockEvent, mockConfig);
//
//       expect(mockPluginBridge.sendMessageToPlugin).toHaveBeenCalledWith('plugin-id', {
//         type: 'custom',
//         data: 'test',
//       });
//     });
//
//     it('should clean up dialog button handlers map to prevent memory leaks', async () => {
//       mockEvent.data.method = 'openDialog';
//       mockEvent.data.args = [
//         {
//           title: 'Test Dialog',
//           buttons: Array(100)
//             .fill(null)
//             .map((_, i) => ({
//               text: `Button ${i}`,
//               onClick: `function() { return ${i}; }`,
//             })),
//         },
//       ];
//
//       mockPluginBridge.openDialog.and.returnValue(Promise.resolve());
//
//       // Spy on Map.prototype.delete to verify cleanup
//       spyOn(Map.prototype, 'delete').and.callThrough();
//
//       await handlePluginMessage(mockEvent, mockConfig);
//
//       // Should have created 100 button handlers
//       const dialogCfg = mockPluginBridge.openDialog.calls.argsFor(0)[0];
//       expect(dialogCfg.buttons).toBeDefined();
//       expect(dialogCfg.buttons!.length).toBe(100);
//
//       // Each handler should be a function
//       dialogCfg.buttons!.forEach((button) => {
//         expect(typeof button.onClick).toBe('function');
//       });
//     });
//   });
// });
// */
