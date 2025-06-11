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

setTimeout(() => {
  // Show a friendly message when a task is completed
  PluginAPI.showSnack({
    msg: '🎉 Hello World! Init!',
    type: 'SUCCESS',
    ico: 'celebration',
  });
  console.log('Hello World Plugin initialized successfully!');
}, 1000);
