// Example TypeScript plugin using @super-productivity/plugin-api

import type {
  PluginAPI,
  PluginHooks,
  TaskData,
  PluginManifest,
} from '@super-productivity/plugin-api';

// Example manifest (would be in manifest.json)
const manifest: PluginManifest = {
  name: 'My Awesome Plugin',
  id: 'my-awesome-plugin',
  manifestVersion: 1,
  version: '1.0.0',
  minSupVersion: '13.0.0',
  description: 'An example plugin with full TypeScript support',
  hooks: [PluginHooks.TASK_COMPLETE, PluginHooks.TASK_UPDATE],
  permissions: ['showSnack', 'getTasks', 'addTask', 'showIndexHtmlAsView', 'openDialog'],
  iFrame: true,
  icon: 'icon.svg',
};

// Plugin code with full type safety
console.log('My Plugin initializing...', PluginAPI);

// Register hook with typed parameters
PluginAPI.registerHook(PluginHooks.TASK_COMPLETE, (taskData: TaskData) => {
  console.log('Task completed!', taskData);

  PluginAPI.showSnack({
    msg: `🎉 Completed: ${taskData.title}`,
    type: 'SUCCESS',
    ico: 'celebration',
  });
});

// Register header button with type safety
PluginAPI.registerHeaderButton({
  label: 'My Dashboard',
  icon: 'dashboard',
  onClick: () => {
    PluginAPI.showIndexHtmlAsView();
  },
});

// Register keyboard shortcut
PluginAPI.registerShortcut({
  id: 'create_example_task',
  label: 'Create Example Task',
  onExec: async () => {
    try {
      const taskId = await PluginAPI.addTask({
        title: '🔌 Task from TypeScript Plugin',
        notes: 'This task was created with full type safety!',
        tagIds: [],
      });

      PluginAPI.showSnack({
        msg: `✅ Created task: ${taskId}`,
        type: 'SUCCESS',
      });
    } catch (error) {
      PluginAPI.showSnack({
        msg: '❌ Failed to create task',
        type: 'ERROR',
      });
    }
  },
});

// Example of working with tasks
async function processAllTasks() {
  try {
    const tasks = await PluginAPI.getTasks();
    const completedTasks = tasks.filter((task) => task.isDone);

    PluginAPI.openDialog({
      htmlContent: `
        <div style="padding: 20px;">
          <h2>Task Summary</h2>
          <p>Total tasks: ${tasks.length}</p>
          <p>Completed: ${completedTasks.length}</p>
          <p>Remaining: ${tasks.length - completedTasks.length}</p>
        </div>
      `,
      buttons: [
        {
          label: 'Close',
          icon: 'close',
          onClick: () => {
            console.log('Dialog closed');
          },
        },
      ],
    });
  } catch (error) {
    console.error('Failed to process tasks:', error);
  }
}
