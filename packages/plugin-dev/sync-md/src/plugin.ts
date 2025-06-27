// Plugin API wrapper for type safety
export const PluginAPI = {
  getAllProjects: async () => {
    if (window.PluginAPI?.getAllProjects) {
      return window.PluginAPI.getAllProjects();
    }
    return [];
  },

  getTasks: async () => {
    if (window.PluginAPI?.getTasks) {
      return window.PluginAPI.getTasks();
    }
    return [];
  },

  addTask: async (task: any) => {
    if (window.PluginAPI?.addTask) {
      return window.PluginAPI.addTask(task);
    }
    throw new Error('PluginAPI.addTask not available');
  },

  updateTask: async (taskId: string, changes: any) => {
    if (window.PluginAPI?.updateTask) {
      return window.PluginAPI.updateTask(taskId, changes);
    }
    throw new Error('PluginAPI.updateTask not available');
  },

  deleteTask: async (taskId: string) => {
    if (window.PluginAPI?.deleteTask) {
      return window.PluginAPI.deleteTask(taskId);
    }
    throw new Error('PluginAPI.deleteTask not available');
  },

  persistDataSynced: async (data: string) => {
    if (window.PluginAPI?.persistDataSynced) {
      return window.PluginAPI.persistDataSynced(data);
    }
    throw new Error('PluginAPI.persistDataSynced not available');
  },

  loadSyncedData: async () => {
    if (window.PluginAPI?.loadSyncedData) {
      return window.PluginAPI.loadSyncedData();
    }
    return null;
  },

  onMessage: (handler: (message: any) => void) => {
    if (window.PluginAPI?.onMessage) {
      window.PluginAPI.onMessage(handler);
    }
  },

  executeNodeScript: async (request: any) => {
    if (window.PluginAPI?.executeNodeScript) {
      return window.PluginAPI.executeNodeScript(request);
    }
    throw new Error('PluginAPI.executeNodeScript not available');
  },

  reorderTasks: async (
    taskIds: string[],
    contextId: string,
    contextType: 'project' | 'task',
  ) => {
    if (window.PluginAPI?.reorderTasks) {
      return window.PluginAPI.reorderTasks(taskIds, contextId, contextType);
    }
    throw new Error('PluginAPI.reorderTasks not available');
  },
};

// Extend window interface
declare global {
  interface Window {
    PluginAPI: any;
  }
}
