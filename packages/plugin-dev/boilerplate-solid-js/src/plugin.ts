import {
  PluginAPI,
  PluginHooks,
  TaskCompletePayload,
  TaskUpdatePayload,
} from '@super-productivity/plugin-api';

declare const plugin: PluginAPI;

// Plugin initialization
plugin.log.info('Boilerplate plugin initialized');

// Example: Register a header button
plugin.registerHeaderButton({
  icon: 'rocket',
  label: 'Open Boilerplate Plugin',
  onClick: () => {
    plugin.showIndexHtmlAsView();
  },
});

// Example: Register a menu entry
plugin.registerMenuEntry({
  label: 'Boilerplate Plugin',
  icon: 'rocket',
  onClick: () => {
    plugin.showIndexHtmlAsView();
  },
});

// Example: Register keyboard shortcut
plugin.registerShortcut({
  keys: 'ctrl+shift+b',
  label: 'Open Boilerplate Plugin',
  action: () => {
    plugin.showIndexHtmlAsView();
  },
});

// Example: Hook into task completion
plugin.registerHook(PluginHooks.TASK_COMPLETE, (taskData: TaskCompletePayload) => {
  plugin.log.info('Task completed:', taskData.task.title);

  // Example: Show notification
  plugin.showSnack({
    msg: `Great job! You completed: ${taskData.task.title}`,
    type: 'SUCCESS',
  });
});

// Example: Hook into task updates
plugin.registerHook(PluginHooks.TASK_UPDATE, (taskData: TaskUpdatePayload) => {
  plugin.log.info('Task updated:', taskData.task.title);
});

// Example: Hook into context changes
plugin.on('contextChange', async (context: { projectId?: string; tagId?: string }) => {
plugin.registerHook(
  PluginHooks.ANY_TASK_UPDATE,
  async (payload: AnyTaskUpdatePayload) => {
    const changes = payload.changes;
    if (changes && 'projectId' in changes && changes.projectId) {
      const projects = await plugin.getAllProjects();
      const currentProject = projects.find((p) => p.id === changes.projectId);
      if (currentProject) {
        plugin.log.info('Switched to project:', currentProject.title);
      }
    }
  },
);

// Example: Custom command handler
plugin.onMessage('getStats', async () => {
  const tasks = await plugin.getTasks();
  const completedToday = tasks.filter(
    (t) => t.isDone && new Date(t.doneOn!).toDateString() === new Date().toDateString(),
  );

  return {
    totalTasks: tasks.length,
    completedToday: completedToday.length,
    pendingTasks: tasks.filter((t) => !t.isDone).length,
  };
});

// Example: Handle custom actions from iframe
plugin.onMessage('createTask', async (data: { title: string; projectId?: string }) => {
  const newTask = await plugin.addTask({
    title: data.title,
    projectId: data.projectId,
  });

  plugin.showSnack({
    msg: `Task "${newTask.title}" created!`,
    type: 'SUCCESS',
  });

  return newTask;
});

// Forward API calls from iframe to plugin API
plugin.onMessage('getTasks', async () => {
  return await plugin.getTasks();
});

plugin.onMessage('getAllProjects', async () => {
  return await plugin.getAllProjects();
});

// Example: Persist plugin data
plugin.onMessage('saveSettings', async (settings: any) => {
  await plugin.persistDataSynced('settings', settings);
  return { success: true };
});

// Example: Load plugin data
plugin.onMessage('loadSettings', async () => {
  const settings = await plugin.loadSyncedData('settings');
  return settings || {};
});

// Plugin cleanup (if needed)
plugin.onDestroy(() => {
  plugin.log('Boilerplate plugin is being destroyed');
});
