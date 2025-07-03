import { FileWatcherBatch, FileWatcherOptions } from '../file-watcher';
import { FileOperations } from '../helper/file-operations';
import { SyncConfig } from '../../shared/types';

// Mock the plugin API
const mockPluginAPI = {
  executeNodeScript: jest.fn(),
  showSnack: jest.fn(),
  getTasks: jest.fn(),
  getAllProjects: jest.fn(),
  updateTask: jest.fn(),
  batchUpdateForProject: jest.fn(),
};

// Set global PluginAPI
(global as any).PluginAPI = mockPluginAPI;

// Mock window for debouncer
(global as any).window = {
  setTimeout: global.setTimeout,
  clearTimeout: global.clearTimeout,
};

// Mock timers for debouncing tests
jest.useFakeTimers();

// Mock file operations
class MockFileOperations implements FileOperations {
  private fileContent: string = '';

  async readFile(filePath: string): Promise<string> {
    return this.fileContent;
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    this.fileContent = content;
  }

  async watchFile(filePath: string, callback: () => void): Promise<() => void> {
    return async () => {};
  }

  setFileContent(content: string): void {
    this.fileContent = content;
  }

  clearAll(): void {
    this.fileContent = '';
  }

  getFileContent(filePath: string): string {
    return this.fileContent;
  }
}

describe('FileWatcherBatch', () => {
  let fileWatcher: FileWatcherBatch;
  let mockFileOps: MockFileOperations;
  let config: SyncConfig;
  let options: FileWatcherOptions;

  beforeEach(() => {
    mockFileOps = new MockFileOperations();
    config = {
      projectId: 'test-project',
      filePath: '/test/tasks.md',
      syncDirection: 'fileToProject',
      enabled: true,
    };
    options = {
      config,
      onSync: jest.fn(),
      onError: jest.fn(),
    };

    fileWatcher = new FileWatcherBatch(options, mockFileOps);

    // Reset all mocks
    jest.clearAllMocks();
    mockFileOps.clearAll();
  });

  afterEach(() => {
    fileWatcher.stop();
    jest.clearAllTimers();
  });

  describe('constructor and basic setup', () => {
    it('should initialize with provided config', () => {
      expect(fileWatcher).toBeDefined();
    });

    it('should use provided file operations', () => {
      const customFileOps = new MockFileOperations();
      const watcher = new FileWatcherBatch(options, customFileOps);
      expect(watcher).toBeDefined();
    });
  });

  describe('start and stop', () => {
    it('should start watching and perform initial sync', async () => {
      // Mock file content
      mockFileOps.setFileContent('/test/tasks.md', '- [ ] Test task');

      // Mock SP tasks
      mockPluginAPI.getTasks.mockResolvedValue([]);
      mockPluginAPI.getAllProjects.mockResolvedValue([
        { id: 'test-project', taskIds: [] },
      ]);

      await fileWatcher.start();

      expect(mockPluginAPI.getTasks).toHaveBeenCalled();
      expect(mockPluginAPI.getAllProjects).toHaveBeenCalled();
    });

    it('should stop watching and clean up', () => {
      fileWatcher.stop();
      // Should not throw and should clean up resources
    });

    it('should not start if already watching', async () => {
      mockFileOps.setFileContent('/test/tasks.md', '- [ ] Test task');
      mockPluginAPI.getTasks.mockResolvedValue([]);
      mockPluginAPI.getAllProjects.mockResolvedValue([
        { id: 'test-project', taskIds: [] },
      ]);

      await fileWatcher.start();
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await fileWatcher.start(); // Second call

      expect(consoleSpy).toHaveBeenCalledWith('File watcher already running');
      consoleSpy.mockRestore();
    });
  });

  describe('performSync', () => {
    beforeEach(() => {
      mockPluginAPI.getTasks.mockResolvedValue([]);
      mockPluginAPI.getAllProjects.mockResolvedValue([
        { id: 'test-project', taskIds: [] },
      ]);
    });

    it('should handle empty markdown file', async () => {
      mockFileOps.setFileContent('/test/tasks.md', '');

      await fileWatcher.performSync();

      expect(options.onSync).toHaveBeenCalledWith({
        success: true,
        taskCount: 0,
      });
    });

    it('should handle sync errors gracefully', async () => {
      mockFileOps.setFileContent('/test/tasks.md', '- [ ] Test task');
      mockPluginAPI.getTasks.mockRejectedValue(new Error('API Error'));

      await fileWatcher.performSync();

      expect(options.onError).toHaveBeenCalledWith(expect.any(Error));
      expect(mockPluginAPI.showSnack).toHaveBeenCalledWith({
        msg: expect.stringContaining('Sync failed:'),
        type: 'ERROR',
      });
    });

    it('should prevent concurrent syncs', async () => {
      mockFileOps.setFileContent('/test/tasks.md', '- [ ] Test task');

      // Make the first sync hang
      let resolveFirst: () => void;
      const firstSyncPromise = new Promise<void>((resolve) => {
        resolveFirst = resolve;
      });
      mockPluginAPI.getTasks.mockImplementationOnce(() => firstSyncPromise);

      // Start first sync
      const sync1Promise = fileWatcher.performSync();

      // Start second sync (should return immediately)
      const sync2Promise = fileWatcher.performSync();

      // Resolve first sync
      resolveFirst!();
      mockPluginAPI.getTasks.mockResolvedValue([]);

      await Promise.all([sync1Promise, sync2Promise]);

      // Should only call getTasks once due to sync in progress protection
      expect(mockPluginAPI.getTasks).toHaveBeenCalledTimes(1);
    });
  });

  describe('file to project sync', () => {
    beforeEach(() => {
      options.config.syncDirection = 'fileToProject';
      fileWatcher = new FileWatcherBatch(options, mockFileOps);
    });

    it('should create new tasks from markdown', async () => {
      const markdownContent = '- [ ] New task\n- [x] Completed task';
      mockFileOps.setFileContent(markdownContent);

      mockPluginAPI.getTasks.mockResolvedValue([]);
      mockPluginAPI.getAllProjects.mockResolvedValue([
        { id: 'test-project', taskIds: [] },
      ]);
      mockPluginAPI.batchUpdateForProject.mockResolvedValue({
        success: true,
        createdTaskIds: { temp_0: 'new-task-1', temp_1: 'new-task-2' },
        errors: [],
      });

      await fileWatcher.performSync();

      expect(mockPluginAPI.batchUpdateForProject).toHaveBeenCalledWith({
        projectId: 'test-project',
        operations: expect.arrayContaining([
          expect.objectContaining({
            type: 'create',
            data: expect.objectContaining({
              title: 'New task',
              isDone: false,
            }),
          }),
          expect.objectContaining({
            type: 'create',
            data: expect.objectContaining({
              title: 'Completed task',
              isDone: true,
            }),
          }),
        ]),
      });
    });

    it('should update existing tasks', async () => {
      const markdownContent = '- [x] <!-- sp:sp-task-1 --> Updated task title';
      mockFileOps.setFileContent(markdownContent);

      const existingTask = {
        id: 'sp-task-1',
        title: 'Old title',
        isDone: false,
        notes: '',
        parentId: null,
        subTaskIds: [],
        projectId: 'test-project',
      };

      mockPluginAPI.getTasks.mockResolvedValue([existingTask]);
      mockPluginAPI.getAllProjects.mockResolvedValue([
        { id: 'test-project', taskIds: ['sp-task-1'] },
      ]);
      mockPluginAPI.batchUpdateForProject.mockResolvedValue({
        success: true,
        createdTaskIds: {},
        errors: [],
      });

      await fileWatcher.performSync();

      expect(mockPluginAPI.batchUpdateForProject).toHaveBeenCalledWith({
        projectId: 'test-project',
        operations: expect.arrayContaining([
          expect.objectContaining({
            type: 'update',
            taskId: 'sp-task-1',
            updates: {
              title: 'Updated task title',
              isDone: true,
            },
          }),
        ]),
      });
    });

    it('should delete removed tasks', async () => {
      const markdownContent = ''; // Empty file
      mockFileOps.setFileContent(markdownContent);

      const existingTask = {
        id: 'sp-task-1',
        title: 'Task to delete',
        isDone: false,
        notes: '',
        parentId: null,
        subTaskIds: [],
        projectId: 'test-project',
      };

      mockPluginAPI.getTasks.mockResolvedValue([existingTask]);
      mockPluginAPI.getAllProjects.mockResolvedValue([
        { id: 'test-project', taskIds: ['sp-task-1'] },
      ]);
      mockPluginAPI.batchUpdateForProject.mockResolvedValue({
        success: true,
        createdTaskIds: {},
        errors: [],
      });

      await fileWatcher.performSync();

      expect(mockPluginAPI.batchUpdateForProject).toHaveBeenCalledWith({
        projectId: 'test-project',
        operations: expect.arrayContaining([
          expect.objectContaining({
            type: 'delete',
            taskId: 'sp-task-1',
          }),
        ]),
      });
    });
  });

  describe('project to file sync', () => {
    beforeEach(() => {
      options.config.syncDirection = 'projectToFile';
      fileWatcher = new FileWatcherBatch(options, mockFileOps);
    });

    it('should write SP tasks to markdown', async () => {
      const spTasks = [
        {
          id: 'task-1',
          title: 'Parent task',
          isDone: false,
          notes: '',
          parentId: null,
          subTaskIds: ['task-2'],
        },
        {
          id: 'task-2',
          title: 'Child task',
          isDone: true,
          notes: '',
          parentId: 'task-1',
          subTaskIds: [],
        },
      ];

      mockFileOps.setFileContent('/test/tasks.md', '');
      mockPluginAPI.getTasks.mockResolvedValue(spTasks);
      mockPluginAPI.getAllProjects.mockResolvedValue([
        { id: 'test-project', taskIds: ['task-1'] },
      ]);

      await fileWatcher.performSync();

      // Wait for the delayed write
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
      await Promise.resolve();

      const writtenContent = mockFileOps.getFileContent();
      expect(writtenContent).toContain('- [ ] <!-- sp:task-1 --> Parent task');
      expect(writtenContent).toContain('  - [x] <!-- sp:task-2 --> Child task');
    });

    it('should write SP task IDs to markdown', async () => {
      const spTasks = [
        {
          id: 'task-1',
          title: 'Task without ID',
          isDone: false,
          notes: '',
          parentId: null,
          subTaskIds: [],
        },
      ];

      mockFileOps.setFileContent('/test/tasks.md', '');
      mockPluginAPI.getTasks.mockResolvedValue(spTasks);
      mockPluginAPI.getAllProjects.mockResolvedValue([
        { id: 'test-project', taskIds: ['task-1'] },
      ]);

      await fileWatcher.performSync();

      // Wait for the delayed write
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
      await Promise.resolve();

      const writtenContent = mockFileOps.getFileContent();
      expect(writtenContent).toContain('- [ ] <!-- sp:task-1 --> Task without ID');
    });
  });

  describe('delayed ID writing', () => {
    it('should schedule delayed ID writing after creating tasks', async () => {
      const markdownContent = '- [ ] New task';
      mockFileOps.setFileContent(markdownContent);

      mockPluginAPI.getTasks.mockResolvedValue([]);
      mockPluginAPI.getAllProjects.mockResolvedValue([
        { id: 'test-project', taskIds: [] },
      ]);
      mockPluginAPI.batchUpdateForProject.mockImplementation(async (args) => {
        // Return created task IDs based on the operations sent
        const createdTaskIds: Record<string, string> = {};
        if (args.operations) {
          args.operations.forEach((op: any) => {
            if (op.type === 'create' && op.tempId) {
              createdTaskIds[op.tempId] =
                `task-${Object.keys(createdTaskIds).length + 1}`;
            }
          });
        }
        return {
          success: true,
          createdTaskIds,
          errors: [],
        };
      });

      await fileWatcher.performSync();

      // Check if pendingIdUpdates has items
      expect((fileWatcher as any).pendingIdUpdates.length).toBeGreaterThan(0);

      // Verify the file doesn't have IDs immediately
      let content = mockFileOps.getFileContent();
      expect(content).toBe('- [ ] New task');

      // Manually call performDelayedIdWriting since timers might not work as expected
      await (fileWatcher as any).performDelayedIdWriting();

      // Now the file should have the ID
      content = mockFileOps.getFileContent();
      expect(content).toMatch(/- \[ \] <!-- sp:task-1 --> New task/);
    });

    it('should force immediate ID writing when requested', async () => {
      const markdownContent = '- [ ] New task';
      mockFileOps.setFileContent(markdownContent);

      mockPluginAPI.getTasks.mockResolvedValue([]);
      mockPluginAPI.getAllProjects.mockResolvedValue([
        { id: 'test-project', taskIds: [] },
      ]);
      mockPluginAPI.batchUpdateForProject.mockImplementation(async (args) => {
        // Return created task IDs based on the operations sent
        const createdTaskIds: Record<string, string> = {};
        if (args.operations) {
          args.operations.forEach((op: any) => {
            if (op.type === 'create' && op.tempId) {
              createdTaskIds[op.tempId] =
                `task-${Object.keys(createdTaskIds).length + 1}`;
            }
          });
        }
        return {
          success: true,
          createdTaskIds,
          errors: [],
        };
      });

      await fileWatcher.performSync();

      // Check if pendingIdUpdates has items
      expect((fileWatcher as any).pendingIdUpdates.length).toBeGreaterThan(0);

      await fileWatcher.forceIdWriting();

      // Should have IDs immediately without waiting
      const content = mockFileOps.getFileContent();
      expect(content).toMatch(/- \[ \] <!-- sp:task-1 --> New task/);
    });

    it('should skip ID writing if task already has ID', async () => {
      const markdownContent = '- [ ] <!-- sp:existing-id --> Task with ID';
      mockFileOps.setFileContent(markdownContent);

      // Simulate pending ID update for a line that already has an ID
      const watcher = fileWatcher as any;
      watcher.pendingIdUpdates = [
        {
          tempId: 'temp_0',
          actualId: 'new-task-1',
          mdId: 'new-task-1',
          line: 0,
          task: { indent: 0, completed: false, title: 'Task with ID' },
        },
      ];

      await fileWatcher.forceIdWriting();

      // Content should remain unchanged
      const content = mockFileOps.getFileContent();
      expect(content).toBe('- [ ] <!-- sp:existing-id --> Task with ID');
    });
  });

  describe('getSyncInfo', () => {
    it('should return current sync status', async () => {
      const info = await fileWatcher.getSyncInfo();

      expect(info).toEqual({
        isWatching: false,
        lastSyncTime: 0,
        taskCount: 0,
      });
    });

    it('should reflect watching status after start', async () => {
      mockFileOps.setFileContent('/test/tasks.md', '- [ ] Test task');
      mockPluginAPI.getTasks.mockResolvedValue([]);
      mockPluginAPI.getAllProjects.mockResolvedValue([
        { id: 'test-project', taskIds: [] },
      ]);

      await fileWatcher.start();
      const info = await fileWatcher.getSyncInfo();

      expect(info.isWatching).toBe(true);
      expect(info.lastSyncTime).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle file read errors', async () => {
      // Make file operations fail
      const errorFileOps = new MockFileOperations();
      jest.spyOn(errorFileOps, 'readFile').mockRejectedValue(new Error('File not found'));

      const errorWatcher = new FileWatcherBatch(options, errorFileOps);

      await errorWatcher.performSync();

      expect(options.onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle batch API errors', async () => {
      mockFileOps.setFileContent('- [ ] New task');
      mockPluginAPI.getTasks.mockResolvedValue([]);
      mockPluginAPI.getAllProjects.mockResolvedValue([
        { id: 'test-project', taskIds: [] },
      ]);
      mockPluginAPI.batchUpdateForProject.mockResolvedValue({
        success: false,
        errors: [{ message: 'Batch operation failed' }],
      });

      await fileWatcher.performSync();

      expect(mockPluginAPI.showSnack).toHaveBeenCalledWith({
        msg: expect.stringContaining('Batch sync failed:'),
        type: 'ERROR',
      });
    });

    it('should handle missing project', async () => {
      mockFileOps.setFileContent('/test/tasks.md', '- [ ] Test task');
      mockPluginAPI.getTasks.mockResolvedValue([]);
      mockPluginAPI.getAllProjects.mockResolvedValue([]); // No projects

      await fileWatcher.performSync();

      expect(options.onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Project not found' }),
      );
    });
  });
});
