// Test Upload Plugin - Minimal implementation for e2e testing
console.log('Test Upload Plugin loading...');

// Show initialization message
PluginAPI.showSnack({
  msg: '🧪 Test Upload Plugin initialized!',
  type: 'SUCCESS',
});

// Register a simple hook
PluginAPI.registerHook(PluginAPI.Hooks.TASK_COMPLETE, function (taskData) {
  console.log('Test Upload Plugin: Task completed!', taskData);

  PluginAPI.showSnack({
    msg: '🧪 Test Plugin: Task completed!',
    type: 'SUCCESS',
  });
});

console.log('Test Upload Plugin loaded successfully');
