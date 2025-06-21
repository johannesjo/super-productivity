// Procrastination Buster Plugin for Super Productivity
declare const PluginAPI: import('@super-productivity/plugin-api').PluginAPI;

console.log('Procrastination Buster plugin loaded!');

// Track if user is stuck on a task
let stuckTimer: any = null;
let currentTaskId: string | null = null;

// Listen for task changes
PluginAPI.registerHook('currentTaskChange', (taskData: any) => {
  const task = taskData as { id: string; title: string } | null;

  if (task) {
    currentTaskId = task.id;
    // Reset timer when task changes
    if (stuckTimer) {
      clearTimeout(stuckTimer);
    }

    // Set a timer to check if user might be procrastinating (15 minutes)
    stuckTimer = setTimeout(
      () => {
        PluginAPI.showSnack({
          msg: 'Need help? Click here for procrastination strategies',
          type: 'INFO',
          ico: 'psychology',
        });
      },
      15 * 60 * 1000,
    );
  } else {
    // No active task
    currentTaskId = null;
    if (stuckTimer) {
      clearTimeout(stuckTimer);
      stuckTimer = null;
    }
  }
});

// Register a shortcut to open the procrastination buster
PluginAPI.registerShortcut({
  id: 'open_procrastination_buster',
  label: 'Open Procrastination Help',
  onExec: () => {
    PluginAPI.showIndexHtmlAsView();
  },
});

// Handle messages from the iframe
PluginAPI.onMessage(async (message: any) => {
  console.log('Plugin received message:', message);

  if (message.type === 'ADD_STRATEGY_TASK') {
    const taskId = await PluginAPI.addTask({
      title: message.strategy,
      notes: `Strategy for ${message.blockerType}`,
      timeEstimate: 5 * 60 * 1000, // 5 minutes default
    });

    return { success: true, taskId };
  }

  if (message.type === 'START_POMODORO') {
    // In a real implementation, this would start a pomodoro timer
    PluginAPI.showSnack({
      msg: 'Pomodoro timer started (25 minutes)',
      type: 'SUCCESS',
    });
    return { success: true };
  }

  return { error: 'Unknown message type' };
});
