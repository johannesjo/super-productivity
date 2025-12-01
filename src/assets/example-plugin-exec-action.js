// Example plugin that demonstrates using the execAction method

// Register a menu entry to test the execAction functionality
PluginAPI.registerMenuEntry({
  label: 'Test Action Execution',
  icon: 'play_arrow',
  onClick: () => {
    // Example 1: Start a pomodoro session
    PluginAPI.execAction({
      type: '[Pomodoro] Start Pomodoro',
    });

    PluginAPI.showSnack({
      msg: 'Started a Pomodoro session!',
      type: 'SUCCESS',
    });
  },
});

// Register shortcuts for common actions
PluginAPI.registerShortcut({
  id: 'toggle-current-task',
  label: 'Toggle Current Task Timer',
  onExec: () => {
    // Toggle the timer on the current task
    PluginAPI.execAction({
      type: '[Task] Toggle start',
    });
  },
});

// Register a header button that adds a new task
PluginAPI.registerHeaderButton({
  label: 'Quick Add Task',
  icon: 'add_task',
  onClick: async () => {
    // First create a task using the API
    const taskId = await PluginAPI.addTask({
      title: 'New task from plugin',
      projectId: null,
      tagIds: [],
    });

    // Then set it as the current task
    PluginAPI.execAction({
      type: '[Task] Set current',
      id: taskId,
    });

    // And start the timer
    PluginAPI.execAction({
      type: '[Task] Toggle start',
    });

    PluginAPI.showSnack({
      msg: 'Created task and started timer!',
      type: 'SUCCESS',
    });
  },
});

// Example of updating configuration
PluginAPI.registerMenuEntry({
  label: 'Toggle Dark Mode',
  icon: 'dark_mode',
  onClick: () => {
    // Get current theme
    const isDarkMode = PluginAPI.cfg.theme === 'dark';

    // Update the theme configuration
    PluginAPI.execAction({
      type: '[GlobalConfig] Update Section',
      payload: {
        sectionKey: 'misc',
        sectionCfg: {
          isDarkMode: !isDarkMode,
        },
      },
    });

    PluginAPI.showSnack({
      msg: `Switched to ${!isDarkMode ? 'dark' : 'light'} mode`,
      type: 'INFO',
    });
  },
});

// Example of working with focus mode
PluginAPI.registerMenuEntry({
  label: 'Start Focus Session',
  icon: 'center_focus_strong',
  onClick: () => {
    PluginAPI.execAction({
      type: '[FocusMode] Start Session',
    });

    PluginAPI.showSnack({
      msg: 'Focus mode activated!',
      type: 'SUCCESS',
    });
  },
});

console.log('Example execAction plugin loaded successfully!');
