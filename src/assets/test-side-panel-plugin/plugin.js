console.log('Side Panel Test Plugin loading...');

// Note: When a plugin has "sidePanel": true in its manifest,
// a side panel button is automatically registered by the plugin runner.
// However, plugins can still manually register additional buttons if needed.

// Register a hook to demonstrate functionality
PluginAPI.registerHook(PluginAPI.Hooks.TASK_COMPLETE, (taskId) => {
  console.log('Task completed in side panel plugin:', taskId);
  PluginAPI.showSnack({
    msg: 'Task completed!',
    type: 'SUCCESS',
  });
});

// Register another hook for task updates
PluginAPI.registerHook(PluginAPI.Hooks.TASK_UPDATE, (taskId) => {
  console.log('Task updated in side panel plugin:', taskId);
});

console.log('Side Panel Test Plugin loaded!');
