// Minimal Super Productivity Plugin
console.log('Minimal plugin loaded!');

// Register a simple hook
PluginAPI.registerHook('taskComplete', function (task) {
  PluginAPI.showSnack({
    msg: 'Task completed: ' + task.title,
    type: 'SUCCESS',
  });
});
