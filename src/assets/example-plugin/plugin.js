// Hello World Plugin
// This plugin demonstrates basic plugin functionality by showing a message when a task is completed

console.log('Hello World Plugin initializing...', PluginAPI);

// Register a hook for when tasks are completed
PluginAPI.registerHook(PluginAPI.Hooks.TASK_COMPLETE, function (taskData) {
  console.log('Hello World Plugin: Task completed!', taskData);

  // Show a friendly message when a task is completed
  PluginAPI.showSnack({
    msg: '🎉 Hello World! Task completed successfully!',
    type: 'SUCCESS',
    ico: 'celebration',
  });
});

// Show initialization message after a short delay
setTimeout(() => {
  PluginAPI.showSnack({
    msg: '🎉 Hello World Plugin initialized!',
    type: 'SUCCESS',
    ico: 'celebration',
  });
  console.log('Hello World Plugin initialized successfully!');
}, 1000);

// Register a header button for quick access
PluginAPI.registerHeaderButton({
  label: 'Plugin Dashboard',
  icon: 'dashboard',
  onClick: function () {
    console.log('Hello World Plugin: Opening dashboard...');
    // Open the plugin's index.html in an iframe view
    PluginAPI.showIndexHtmlAsView();
  },
});

// Note: Menu entry is automatically registered by the plugin system
// when iFrame is true and isSkipMenuEntry is not set to true
