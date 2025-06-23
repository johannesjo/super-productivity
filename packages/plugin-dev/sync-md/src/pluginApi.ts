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
};

// Extend window interface
declare global {
  interface Window {
    PluginAPI: any;
  }
}
