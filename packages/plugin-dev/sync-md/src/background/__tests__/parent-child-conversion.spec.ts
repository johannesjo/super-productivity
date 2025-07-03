import { FileWatcherBatch } from '../file-watcher';
import { SyncConfig } from '../../shared/types';
import { FileOperations } from '../helper/file-operations';

// Mock PluginAPI
const mockPluginAPI = {
  showSnack: jest.fn(),
  updateTask: jest.fn(),
  batchUpdateForProject: jest.fn(),
  getTasks: jest.fn(),
  getAllProjects: jest.fn(),
  executeNodeScript: jest.fn(),
};

// @ts-ignore
global.PluginAPI = mockPluginAPI;

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
}

describe('Parent-Child Task Conversion', () => {
  let fileWatcher: FileWatcherBatch;
  let mockFileOps: MockFileOperations;
  const config: SyncConfig = {
    enabled: true,
    filePath: '/test/tasks.md',
    projectId: 'test-project',
    syncDirection: 'bidirectional',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFileOps = new MockFileOperations();
    fileWatcher = new FileWatcherBatch({ config }, mockFileOps as any);

    // Setup default project
    mockPluginAPI.getAllProjects.mockResolvedValue([
      { id: 'test-project', taskIds: ['task1', 'task2', 'task3'] },
    ]);
  });

  describe('Converting subtask to parent task', () => {
    it('should convert subtask to parent when unindented', async () => {
      // Initial state: task2 is a subtask of task1
      const spTasks = [
        {
          id: 'task1',
          title: 'Parent Task',
          isDone: false,
          notes: '',
          subTaskIds: ['task2'],
          parentId: null,
        },
        {
          id: 'task2',
          title: 'Sub Task',
          isDone: false,
          notes: '',
          parentId: 'task1',
          subTaskIds: [],
        },
      ];

      mockPluginAPI.getTasks.mockResolvedValue(spTasks);

      // Markdown with task2 unindented (no longer a subtask)
      const markdownContent = `- [ ] <!-- sp:task1 --> Parent Task
- [ ] <!-- sp:task2 --> Sub Task`;

      mockFileOps.setFileContent(markdownContent);

      mockPluginAPI.batchUpdateForProject.mockResolvedValue({
        success: true,
        createdTaskIds: {},
      });

      await fileWatcher.performSync(undefined, undefined, 'file');

      expect(mockPluginAPI.batchUpdateForProject).toHaveBeenCalledWith({
        projectId: 'test-project',
        operations: [
          {
            type: 'update',
            taskId: 'task2',
            updates: {
              parentId: null,
            },
          },
        ],
      });
    });

    it('should allow converting subtask with repeatCfgId to parent', async () => {
      const spTasks = [
        {
          id: 'task1',
          title: 'Parent Task',
          isDone: false,
          notes: '',
          subTaskIds: ['task2'],
          parentId: null,
        },
        {
          id: 'task2',
          title: 'Repeating Sub Task',
          isDone: false,
          notes: '',
          parentId: 'task1',
          repeatCfgId: 'repeat-123',
          subTaskIds: [],
        },
      ];

      mockPluginAPI.getTasks.mockResolvedValue(spTasks);

      // Unindent the repeating task
      const markdownContent = `- [ ] <!-- sp:task1 --> Parent Task
- [ ] <!-- sp:task2 --> Repeating Sub Task`;

      mockFileOps.setFileContent(markdownContent);

      mockPluginAPI.batchUpdateForProject.mockResolvedValue({
        success: true,
        createdTaskIds: {},
      });

      await fileWatcher.performSync(undefined, undefined, 'file');

      // Should allow conversion to parent
      expect(mockPluginAPI.batchUpdateForProject).toHaveBeenCalledWith({
        projectId: 'test-project',
        operations: [
          {
            type: 'update',
            taskId: 'task2',
            updates: {
              parentId: null,
            },
          },
        ],
      });
    });
  });

  describe('Converting parent task to subtask', () => {
    it('should convert parent to subtask when indented', async () => {
      const spTasks = [
        {
          id: 'task1',
          title: 'Task 1',
          isDone: false,
          notes: '',
          parentId: null,
          subTaskIds: [],
        },
        {
          id: 'task2',
          title: 'Task 2',
          isDone: false,
          notes: '',
          parentId: null,
          subTaskIds: [],
        },
      ];

      mockPluginAPI.getTasks.mockResolvedValue(spTasks);

      // Indent task2 under task1
      const markdownContent = `- [ ] <!-- sp:task1 --> Task 1
  - [ ] <!-- sp:task2 --> Task 2`;

      mockFileOps.setFileContent(markdownContent);

      mockPluginAPI.batchUpdateForProject.mockResolvedValue({
        success: true,
        createdTaskIds: {},
      });

      await fileWatcher.performSync(undefined, undefined, 'file');

      expect(mockPluginAPI.batchUpdateForProject).toHaveBeenCalledWith({
        projectId: 'test-project',
        operations: [
          {
            type: 'update',
            taskId: 'task2',
            updates: {
              parentId: 'task1',
            },
          },
        ],
      });
    });

    it('should prevent converting task with repeatCfgId to subtask', async () => {
      const spTasks = [
        {
          id: 'task1',
          title: 'Task 1',
          isDone: false,
          notes: '',
          parentId: null,
          subTaskIds: [],
        },
        {
          id: 'task2',
          title: 'Repeating Task',
          isDone: false,
          notes: '',
          repeatCfgId: 'repeat-123',
          parentId: null,
          subTaskIds: [],
        },
      ];

      mockPluginAPI.getTasks.mockResolvedValue(spTasks);

      // Try to indent the repeating task
      const markdownContent = `- [ ] <!-- sp:task1 --> Task 1
  - [ ] <!-- sp:task2 --> Repeating Task`;

      mockFileOps.setFileContent(markdownContent);

      mockPluginAPI.batchUpdateForProject.mockResolvedValue({
        success: true,
        createdTaskIds: {},
      });

      await fileWatcher.performSync(undefined, undefined, 'file');

      // Should not call batchUpdate since no operations are needed
      expect(mockPluginAPI.batchUpdateForProject).not.toHaveBeenCalled();

      // Should show warning
      expect(mockPluginAPI.showSnack).toHaveBeenCalledWith({
        msg: 'Cannot convert "Repeating Task" to subtask - repeating tasks must remain as parent tasks',
        type: 'WARNING',
      });
    });

    it('should prevent converting task with issueId to subtask', async () => {
      const spTasks = [
        {
          id: 'task1',
          title: 'Task 1',
          isDone: false,
          notes: '',
          parentId: null,
          subTaskIds: [],
        },
        {
          id: 'task2',
          title: 'Issue Task',
          isDone: false,
          notes: '',
          issueId: 'JIRA-123',
          parentId: null,
          subTaskIds: [],
        },
      ];

      mockPluginAPI.getTasks.mockResolvedValue(spTasks);

      // Try to indent the issue-linked task
      const markdownContent = `- [ ] <!-- sp:task1 --> Task 1
  - [ ] <!-- sp:task2 --> Issue Task`;

      mockFileOps.setFileContent(markdownContent);

      mockPluginAPI.batchUpdateForProject.mockResolvedValue({
        success: true,
        createdTaskIds: {},
      });

      await fileWatcher.performSync(undefined, undefined, 'file');

      // Should not call batchUpdate since no operations are needed
      expect(mockPluginAPI.batchUpdateForProject).not.toHaveBeenCalled();

      // Should show warning
      expect(mockPluginAPI.showSnack).toHaveBeenCalledWith({
        msg: 'Cannot convert "Issue Task" to subtask - issue-linked tasks must remain as parent tasks',
        type: 'WARNING',
      });
    });
  });

  describe('Complex hierarchy changes', () => {
    it('should handle moving subtask to different parent', async () => {
      const spTasks = [
        {
          id: 'task1',
          title: 'Parent 1',
          isDone: false,
          notes: '',
          subTaskIds: ['task3'],
          parentId: null,
        },
        {
          id: 'task2',
          title: 'Parent 2',
          isDone: false,
          notes: '',
          subTaskIds: [],
          parentId: null,
        },
        {
          id: 'task3',
          title: 'Subtask',
          isDone: false,
          notes: '',
          parentId: 'task1',
          subTaskIds: [],
        },
      ];

      mockPluginAPI.getTasks.mockResolvedValue(spTasks);

      // Move subtask from parent1 to parent2
      const markdownContent = `- [ ] <!-- sp:task1 --> Parent 1
- [ ] <!-- sp:task2 --> Parent 2
  - [ ] <!-- sp:task3 --> Subtask`;

      mockFileOps.setFileContent(markdownContent);

      mockPluginAPI.batchUpdateForProject.mockResolvedValue({
        success: true,
        createdTaskIds: {},
      });

      await fileWatcher.performSync(undefined, undefined, 'file');

      expect(mockPluginAPI.batchUpdateForProject).toHaveBeenCalledWith({
        projectId: 'test-project',
        operations: [
          {
            type: 'update',
            taskId: 'task3',
            updates: {
              parentId: 'task2',
            },
          },
        ],
      });
    });
  });
});
