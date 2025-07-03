import { FileWatcherBatch } from '../file-watcher';
import { PluginFileOperations } from '../helper/file-operations';
import { SyncConfig } from '../../shared/types';

// Mock PluginAPI
const mockPluginAPI = {
  getTasks: jest.fn(),
  getAllProjects: jest.fn(),
  updateTask: jest.fn(),
  createTask: jest.fn(),
  deleteTask: jest.fn(),
  batchUpdateForProject: jest.fn(),
  showSnack: jest.fn(),
  executeNodeScript: jest.fn(),
};

(global as any).PluginAPI = mockPluginAPI;

describe('Task Reordering', () => {
  let fileWatcher: FileWatcherBatch;
  let mockFileOps: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock file operations
    mockFileOps = {
      readFile: jest.fn(),
      writeFile: jest.fn(),
    };

    const config: SyncConfig = {
      enabled: true,
      filePath: '/test/tasks.md',
      projectId: 'proj1',
      syncDirection: 'bidirectional',
    };

    fileWatcher = new FileWatcherBatch({ config }, mockFileOps);
  });

  describe('Markdown order changes', () => {
    it('should detect and sync task reordering from markdown to SP', async () => {
      // Initial markdown with tasks in one order
      const initialMarkdown = `- [ ] <!-- sp:task1 --> Task One
- [ ] <!-- sp:task2 --> Task Two
- [ ] <!-- sp:task3 --> Task Three`;

      // Reordered markdown (Task Two moved to top)
      const reorderedMarkdown = `- [ ] <!-- sp:task2 --> Task Two
- [ ] <!-- sp:task1 --> Task One
- [ ] <!-- sp:task3 --> Task Three`;

      mockFileOps.readFile.mockResolvedValue(reorderedMarkdown);

      // Mock SP tasks in original order
      const spTasks = [
        { id: 'task1', title: 'Task One', isDone: false },
        { id: 'task2', title: 'Task Two', isDone: false },
        { id: 'task3', title: 'Task Three', isDone: false },
      ];

      mockPluginAPI.getTasks.mockResolvedValue(spTasks);
      mockPluginAPI.getAllProjects.mockResolvedValue([
        { id: 'proj1', title: 'Project 1', taskIds: ['task1', 'task2', 'task3'] },
      ]);

      mockPluginAPI.batchUpdateForProject.mockResolvedValue({
        success: true,
        createdTaskIds: {},
      });

      await fileWatcher.performSync(undefined, undefined, 'file');

      // Should call batchUpdate with reorder operation
      expect(mockPluginAPI.batchUpdateForProject).toHaveBeenCalledWith({
        projectId: 'proj1',
        operations: expect.arrayContaining([
          {
            type: 'reorder',
            taskIds: ['task2', 'task1', 'task3'], // New order from markdown
          },
        ]),
      });
    });

    it('should preserve subtask relationships when reordering parent tasks', async () => {
      const reorderedMarkdown = `- [ ] <!-- sp:task2 --> Task Two
  - [ ] <!-- sp:sub2 --> Subtask of Two
- [ ] <!-- sp:task1 --> Task One
  - [ ] <!-- sp:sub1 --> Subtask of One`;

      mockFileOps.readFile.mockResolvedValue(reorderedMarkdown);

      const spTasks = [
        { id: 'task1', title: 'Task One', isDone: false, subTaskIds: ['sub1'] },
        { id: 'sub1', title: 'Subtask of One', isDone: false, parentId: 'task1' },
        { id: 'task2', title: 'Task Two', isDone: false, subTaskIds: ['sub2'] },
        { id: 'sub2', title: 'Subtask of Two', isDone: false, parentId: 'task2' },
      ];

      mockPluginAPI.getTasks.mockResolvedValue(spTasks);
      mockPluginAPI.getAllProjects.mockResolvedValue([
        { id: 'proj1', title: 'Project 1', taskIds: ['task1', 'task2'] },
      ]);

      mockPluginAPI.batchUpdateForProject.mockResolvedValue({
        success: true,
        createdTaskIds: {},
      });

      await fileWatcher.performSync(undefined, undefined, 'file');

      // Should only reorder top-level tasks, not subtasks
      expect(mockPluginAPI.batchUpdateForProject).toHaveBeenCalledWith({
        projectId: 'proj1',
        operations: expect.arrayContaining([
          {
            type: 'reorder',
            taskIds: ['task2', 'task1'], // Only parent tasks in new order
          },
        ]),
      });
    });
  });

  describe('SuperProductivity order changes', () => {
    it('should update markdown to match SP task order when syncing projectToFile', async () => {
      jest.useFakeTimers();
      const currentMarkdown = `- [ ] <!-- sp:task1 --> Task One
- [ ] <!-- sp:task2 --> Task Two
- [ ] <!-- sp:task3 --> Task Three`;

      mockFileOps.readFile.mockResolvedValue(currentMarkdown);

      // SP has tasks in different order
      const spTasks = [
        { id: 'task3', title: 'Task Three', isDone: false },
        { id: 'task1', title: 'Task One', isDone: false },
        { id: 'task2', title: 'Task Two', isDone: false },
      ];

      mockPluginAPI.getTasks.mockResolvedValue(spTasks);
      mockPluginAPI.getAllProjects.mockResolvedValue([
        { id: 'proj1', title: 'Project 1', taskIds: ['task3', 'task1', 'task2'] },
      ]);

      await fileWatcher.performSync(undefined, undefined, 'sp');

      // Fast-forward time to trigger the delayed write
      jest.advanceTimersByTime(2000);
      await Promise.resolve(); // Let any pending promises resolve
      await Promise.resolve();

      // Should write markdown in SP's order
      expect(mockFileOps.writeFile).toHaveBeenCalledWith(
        '/test/tasks.md',
        expect.stringContaining(
          `- [ ] <!-- sp:task3 --> Task Three
- [ ] <!-- sp:task1 --> Task One
- [ ] <!-- sp:task2 --> Task Two`,
        ),
      );

      jest.useRealTimers();
    });

    it('should maintain task hierarchy when reordering from SP', async () => {
      jest.useFakeTimers();
      const currentMarkdown = `- [ ] <!-- sp:task1 --> Task One
  - [ ] <!-- sp:sub1 --> Subtask of One
- [ ] <!-- sp:task2 --> Task Two
  - [ ] <!-- sp:sub2 --> Subtask of Two`;

      mockFileOps.readFile.mockResolvedValue(currentMarkdown);

      // SP has reordered parent tasks
      const spTasks = [
        { id: 'task2', title: 'Task Two', isDone: false, subTaskIds: ['sub2'] },
        { id: 'sub2', title: 'Subtask of Two', isDone: false, parentId: 'task2' },
        { id: 'task1', title: 'Task One', isDone: false, subTaskIds: ['sub1'] },
        { id: 'sub1', title: 'Subtask of One', isDone: false, parentId: 'task1' },
      ];

      mockPluginAPI.getTasks.mockResolvedValue(spTasks);
      mockPluginAPI.getAllProjects.mockResolvedValue([
        { id: 'proj1', title: 'Project 1', taskIds: ['task2', 'task1'] },
      ]);

      await fileWatcher.performSync(undefined, undefined, 'sp');

      // Fast-forward time to trigger the delayed write
      jest.advanceTimersByTime(2000);
      await Promise.resolve(); // Let any pending promises resolve
      await Promise.resolve();

      // Should write markdown with correct hierarchy
      expect(mockFileOps.writeFile).toHaveBeenCalledWith(
        '/test/tasks.md',
        expect.stringContaining(
          `- [ ] <!-- sp:task2 --> Task Two
  - [ ] <!-- sp:sub2 --> Subtask of Two
- [ ] <!-- sp:task1 --> Task One
  - [ ] <!-- sp:sub1 --> Subtask of One`,
        ),
      );

      jest.useRealTimers();
    });
  });

  describe('Edge cases', () => {
    it('should not create duplicate reorder operations when order is unchanged', async () => {
      const markdown = `- [ ] <!-- sp:task1 --> Task One
- [ ] <!-- sp:task2 --> Task Two`;

      mockFileOps.readFile.mockResolvedValue(markdown);

      // SP tasks in same order
      const spTasks = [
        { id: 'task1', title: 'Task One', isDone: false },
        { id: 'task2', title: 'Task Two', isDone: false },
      ];

      mockPluginAPI.getTasks.mockResolvedValue(spTasks);
      mockPluginAPI.getAllProjects.mockResolvedValue([
        { id: 'proj1', title: 'Project 1', taskIds: ['task1', 'task2'] },
      ]);

      mockPluginAPI.batchUpdateForProject.mockResolvedValue({
        success: true,
        createdTaskIds: {},
      });

      await fileWatcher.performSync(undefined, undefined, 'file');

      // Should not include reorder operation
      const calls = mockPluginAPI.batchUpdateForProject.mock.calls;
      if (calls.length > 0) {
        const operations = calls[0][0].operations;
        expect(operations.filter((op: any) => op.type === 'reorder')).toHaveLength(0);
      }
    });

    it('should handle moving a subtask to become a root task', async () => {
      const markdown = `- [ ] <!-- sp:task1 --> Task One
- [ ] <!-- sp:sub1 --> Former Subtask Now Root`;

      mockFileOps.readFile.mockResolvedValue(markdown);

      const spTasks = [
        { id: 'task1', title: 'Task One', isDone: false, subTaskIds: ['sub1'] },
        {
          id: 'sub1',
          title: 'Former Subtask Now Root',
          isDone: false,
          parentId: 'task1',
        },
      ];

      mockPluginAPI.getTasks.mockResolvedValue(spTasks);
      mockPluginAPI.getAllProjects.mockResolvedValue([
        { id: 'proj1', title: 'Project 1', taskIds: ['task1'] },
      ]);

      mockPluginAPI.batchUpdateForProject.mockResolvedValue({
        success: true,
        createdTaskIds: {},
      });

      await fileWatcher.performSync(undefined, undefined, 'file');

      // Should update parent relationship
      expect(mockPluginAPI.batchUpdateForProject).toHaveBeenCalledWith({
        projectId: 'proj1',
        operations: expect.arrayContaining([
          {
            type: 'update',
            taskId: 'sub1',
            updates: expect.objectContaining({
              parentId: null,
            }),
          },
        ]),
      });
    });
  });
});
