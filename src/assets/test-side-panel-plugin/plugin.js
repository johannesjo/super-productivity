console.log('Side Panel Test Plugin loading...');

// Register a side panel button with custom onClick behavior
PluginAPI.registerSidePanelButton({
  label: 'Side Panel Test',
  icon: 'dashboard',
  onClick: () => {
    console.log('Side panel button clicked!');
    // The PluginService will handle setting this as the active plugin
  },
});

// Register a hook to show it's working
PluginAPI.registerHook(PluginAPI.Hooks.TASK_COMPLETE, (taskId) => {
  console.log('Task completed in side panel plugin:', taskId);
});

console.log('Side Panel Test Plugin loaded!');
