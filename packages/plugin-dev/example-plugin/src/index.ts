// Example TypeScript plugin for Super Productivity
// This demonstrates how to use the plugin API with full type safety

declare const PluginAPI: import('@super-productivity/plugin-api').PluginAPI;

import type { TaskData } from '@super-productivity/plugin-api';

console.log('Example Plugin initializing...');

// Store plugin state
interface PluginState {
  taskCompletedCount: number;
  lastCompletedTask: TaskData | null;
}

let state: PluginState = {
  taskCompletedCount: 0,
  lastCompletedTask: null,
};

// Load persisted state on startup
async function loadState(): Promise<void> {
  try {
    const savedData = await PluginAPI.loadSyncedData();
    if (savedData) {
      state = JSON.parse(savedData);
      console.log('Loaded plugin state:', state);
    }
  } catch (error) {
    console.error('Failed to load plugin state:', error);
  }
}

// Save state
async function saveState(): Promise<void> {
  try {
    await PluginAPI.persistDataSynced(JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save plugin state:', error);
  }
}

// Initialize plugin
loadState();

// Register hooks
PluginAPI.registerHook('taskComplete', async (taskData: unknown) => {
  const task = taskData as TaskData;
  console.log('Task completed:', task);

  state.taskCompletedCount++;
  state.lastCompletedTask = task;
  await saveState();

  PluginAPI.showSnack({
    msg: `Great job! You've completed ${state.taskCompletedCount} tasks today!`,
    type: 'SUCCESS',
    ico: 'check_circle',
  });
});

PluginAPI.registerHook('taskUpdate', (taskData: unknown) => {
  const task = taskData as TaskData;
  console.log('Task updated:', task);
});

// Register UI components
PluginAPI.registerShortcut({
  id: 'show_stats',
  label: 'Show Task Statistics',
  onExec: async () => {
    const tasks = await PluginAPI.getTasks();
    const completedTasks = tasks.filter((task) => task.isDone);
    const totalTimeSpent = tasks.reduce((sum, task) => sum + (task.timeSpent || 0), 0);

    PluginAPI.openDialog({
      htmlContent: `
        <div style="padding: 20px; font-family: Arial, sans-serif;">
          <h2>📊 Task Statistics</h2>
          <div style="margin: 20px 0;">
            <p><strong>Total tasks:</strong> ${tasks.length}</p>
            <p><strong>Completed:</strong> ${completedTasks.length}</p>
            <p><strong>Completion rate:</strong> ${Math.round((completedTasks.length / tasks.length) * 100)}%</p>
            <p><strong>Total time tracked:</strong> ${Math.round(totalTimeSpent / 1000 / 60)} minutes</p>
            <p><strong>Tasks completed this session:</strong> ${state.taskCompletedCount}</p>
          </div>
          ${
            state.lastCompletedTask
              ? `
            <div style="margin-top: 20px; padding: 15px; background: #f0f0f0; border-radius: 5px;">
              <h3>Last completed task:</h3>
              <p>${state.lastCompletedTask.title}</p>
            </div>
          `
              : ''
          }
        </div>
      `,
      buttons: [
        {
          label: 'Close',
          onClick: () => console.log('Dialog closed'),
        },
        {
          label: 'Reset Counter',
          color: 'warn',
          onClick: async () => {
            state.taskCompletedCount = 0;
            state.lastCompletedTask = null;
            await saveState();
            PluginAPI.showSnack({
              msg: 'Counter reset!',
              type: 'SUCCESS',
            });
          },
        },
      ],
    });
  },
});

// Message handler for iframe communication
PluginAPI.onMessage(async (message: any) => {
  console.log('Received message from iframe:', message);

  if (message.type === 'GET_STATS') {
    return {
      taskCompletedCount: state.taskCompletedCount,
      lastCompletedTask: state.lastCompletedTask,
    };
  }

  if (message.type === 'CREATE_TASK') {
    const taskId = await PluginAPI.addTask({
      title: message.title || 'Task from plugin',
      notes: message.notes || '',
    });
    return { success: true, taskId };
  }

  return { error: 'Unknown message type' };
});

console.log('Example Plugin loaded successfully!');
