// Jest setup file
import { PluginAPI } from '@super-productivity/plugin-api';

// Create a mock PluginAPI
const mockPluginAPI: PluginAPI = {
  getTasks: jest.fn(async () => []),
  getAllProjects: jest.fn(async () => []),
  getProjects: jest.fn(() => []),
  onTasksUpdated$: {
    subscribe: jest.fn(),
  },
  onProjectsUpdated$: {
    subscribe: jest.fn(),
  },
  batchActions: jest.fn(),
  executeNodeScript: jest.fn(async () => ({
    success: true,
    result: { success: true },
  })),
  loadSyncedData: jest.fn(async () => null),
  persistDataSynced: jest.fn(async () => {}),
  onMessage: jest.fn(),
  ui: {
    sendCommand: jest.fn(),
    onCommand$: {
      subscribe: jest.fn(),
    },
  },
  log: jest.fn(),
  showSnack: jest.fn(),
  updateTask: jest.fn(),
  addTask: jest.fn(),
  deleteTask: jest.fn(),
  getProject: jest.fn(),
  triggerAction: jest.fn(),
} as unknown as PluginAPI;

// Assign to global
(global as any).PluginAPI = mockPluginAPI;
