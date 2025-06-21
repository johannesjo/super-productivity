// Simple TypeScript Plugin
declare const PluginAPI: import('@super-productivity/plugin-api').PluginAPI;

console.log('Simple TypeScript plugin loaded!');

// Track completed tasks count
let completedCount = 0;

PluginAPI.registerHook('taskComplete', (task: any) => {
  completedCount++;

  PluginAPI.showSnack({
    msg: `Task completed! (${completedCount} today)`,
    type: 'SUCCESS',
  });
});

// Add a simple shortcut
PluginAPI.registerShortcut({
  id: 'show_count',
  label: 'Show Completed Count',
  onExec: () => {
    PluginAPI.showSnack({
      msg: `You've completed ${completedCount} tasks today!`,
      type: 'INFO',
    });
  },
});
