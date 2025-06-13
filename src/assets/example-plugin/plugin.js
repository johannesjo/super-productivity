// Hello World Plugin
// This plugin demonstrates basic plugin functionality including:
// - Showing a message when a task is completed
// - Adding a header button
// - Registering keyboard shortcuts (configurable in Settings → Keyboard)

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

// Register a keyboard shortcut
PluginAPI.registerShortcut({
  label: 'Show Hello Message',
  onExec: function () {
    console.log('Hello World Plugin: Shortcut triggered!');

    // Show a dialog with a custom message
    PluginAPI.openDialog({
      htmlContent: `
        <div style="padding: 20px; text-align: center;">
          <h2 style="color: #4CAF50;">🎉 Hello from the Plugin!</h2>
          <p>This dialog was triggered by your custom keyboard shortcut.</p>
          <p>You can configure this shortcut in Settings → Keyboard.</p>
        </div>
      `,
      buttons: [
        {
          label: 'Awesome!',
          icon: 'thumb_up',
          color: 'primary',
          onClick: function () {
            PluginAPI.showSnack({
              msg: 'Thanks for trying the shortcut! 🚀',
              type: 'SUCCESS',
            });
          },
        },
      ],
    });
  },
});

// Register another shortcut for quick task creation
PluginAPI.registerShortcut({
  label: 'Create Example Task',
  onExec: async function () {
    try {
      // Create a new task with the plugin
      const taskId = await PluginAPI.addTask({
        title: '🔌 Task created by Hello World Plugin',
        notes:
          'This task was created using a keyboard shortcut from the Hello World plugin!',
        tagIds: [],
      });

      console.log('Hello World Plugin: Created task with ID:', taskId);

      PluginAPI.showSnack({
        msg: '✅ Example task created successfully!',
        type: 'SUCCESS',
      });
    } catch (error) {
      console.error('Hello World Plugin: Failed to create task:', error);
      PluginAPI.showSnack({
        msg: '❌ Failed to create task',
        type: 'ERROR',
      });
    }
  },
});

// Note: Menu entry is automatically registered by the plugin system
// when iFrame is true and isSkipMenuEntry is not set to true
