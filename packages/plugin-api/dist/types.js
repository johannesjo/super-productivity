'use strict';
// Types for Super Productivity Plugin API
// This package provides TypeScript types for developing plugins
Object.defineProperty(exports, '__esModule', { value: true });
exports.PluginHooks = void 0;
var PluginHooks;
(function (PluginHooks) {
  PluginHooks['TASK_COMPLETE'] = 'taskComplete';
  PluginHooks['TASK_UPDATE'] = 'taskUpdate';
  PluginHooks['TASK_DELETE'] = 'taskDelete';
  PluginHooks['CURRENT_TASK_CHANGE'] = 'currentTaskChange';
  PluginHooks['FINISH_DAY'] = 'finishDay';
  PluginHooks['LANGUAGE_CHANGE'] = 'languageChange';
  PluginHooks['PERSISTED_DATA_UPDATE'] = 'persistedDataUpdate';
  PluginHooks['ACTION'] = 'action';
})(PluginHooks || (exports.PluginHooks = PluginHooks = {}));
// Global PluginAPI interface for runtime use
// Note: This is commented out to avoid conflicts with node_modules version
// declare global {
//   interface Window {
//     PluginAPI: PluginAPI;
//   }
//
//   // For plugin development without window reference
//   const PluginAPI: PluginAPI;
// }
