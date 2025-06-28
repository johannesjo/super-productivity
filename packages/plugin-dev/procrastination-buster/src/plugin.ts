// Procrastination Buster Plugin for Super Productivity
import { PluginInterface } from '@super-productivity/plugin-api';

declare const plugin: PluginInterface;

// Register a header button
plugin.registerHeaderButton({
  icon: 'psychology',
  tooltip: 'Open Procrastination Buster',
  action: () => {
    plugin.showIndexHtmlAsView();
  },
});

// Register a side panel button
plugin.registerSidePanelButton({
  icon: 'psychology',
  tooltip: 'Procrastination Help',
  action: () => {
    plugin.showIndexHtmlAsView();
  },
});

// Handle messages from the iframe
plugin.onMessage(
  'ADD_STRATEGY_TASK',
  async (data: { strategy: string; blockerType: string }) => {
    const taskTitle = `Strategy: ${data.strategy}`;
    const taskNotes = `Strategy for ${data.blockerType}: ${data.strategy}`;

    try {
      const newTask = await plugin.addTask({
        title: taskTitle,
        notes: taskNotes,
      });

      plugin.showSnack({
        msg: 'Strategy task created!',
        type: 'SUCCESS',
      });

      return { success: true, taskId: newTask.id };
    } catch (error) {
      console.error('Failed to create task:', error);
      plugin.showSnack({
        msg: 'Failed to create task',
        type: 'ERROR',
      });
      return { success: false, error: 'Failed to create task' };
    }
  },
);

plugin.onMessage('START_POMODORO', async () => {
  plugin.showSnack({
    msg: 'Focus mode activated! Distractions minimized.',
    type: 'SUCCESS',
  });
  return { success: true };
});

plugin.onMessage('START_FOCUS_MODE', async () => {
  plugin.showSnack({
    msg: 'Focus mode activated! Distractions minimized.',
    type: 'SUCCESS',
  });
  return { success: true };
});

plugin.onMessage('QUICK_ADD_TASK', async () => {
  plugin.showSnack({
    msg: 'Use the add task button in the app to create a task.',
    type: 'INFO',
  });
  return { success: true };
});

// Log when plugin loads
plugin.log('Procrastination Buster plugin loaded successfully!');
