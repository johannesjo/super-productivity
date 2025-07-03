import { FileWatcherBatch } from '../file-watcher';
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

describe('Bidirectional Notes Sync', () => {
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

  describe('Removing checklist items from markdown', () => {
    it('should remove deleted checklist items from subtask notes', async () => {
      // Markdown with one checklist item removed from subtask notes
      const markdown = `- [ ] <!-- sp:parent1 --> Parent Task
  - [ ] <!-- sp:subtask1 --> Subtask with checklist
    - [ ] First checklist item`;
      // Note: "Second checklist item" was removed from notes

      mockFileOps.readFile.mockResolvedValue(markdown);

      // SP tasks where subtask still has both checklist items in notes
      const spTasks = [
        {
          id: 'parent1',
          title: 'Parent Task',
          isDone: false,
          subTaskIds: ['subtask1'],
        },
        {
          id: 'subtask1',
          title: 'Subtask with checklist',
          isDone: false,
          parentId: 'parent1',
          notes: '- [ ] First checklist item\n- [ ] Second checklist item',
        },
      ];

      mockPluginAPI.getTasks.mockResolvedValue(spTasks);
      mockPluginAPI.getAllProjects.mockResolvedValue([
        { id: 'proj1', title: 'Project 1', taskIds: ['parent1'] },
      ]);

      mockPluginAPI.batchUpdateForProject.mockResolvedValue({
        success: true,
        createdTaskIds: {},
      });

      await fileWatcher.performSync(undefined, undefined, 'file');

      // Should update subtask notes to match markdown (only first checklist item)
      expect(mockPluginAPI.batchUpdateForProject).toHaveBeenCalledWith({
        projectId: 'proj1',
        operations: expect.arrayContaining([
          {
            type: 'update',
            taskId: 'subtask1',
            updates: { notes: '    - [ ] First checklist item' },
          },
        ]),
      });
    });

    it('should update checked state of checklist items in notes', async () => {
      // Markdown where checklist item in notes is marked as completed
      const markdown = `- [ ] <!-- sp:parent1 --> Parent Task
  - [ ] <!-- sp:subtask1 --> Subtask with checklist
    - [x] Completed checklist item`;

      mockFileOps.readFile.mockResolvedValue(markdown);

      // SP task where checklist item is still unchecked in notes
      const spTasks = [
        {
          id: 'parent1',
          title: 'Parent Task',
          isDone: false,
          subTaskIds: ['subtask1'],
        },
        {
          id: 'subtask1',
          title: 'Subtask with checklist',
          isDone: false,
          parentId: 'parent1',
          notes: '- [ ] Completed checklist item',
        },
      ];

      mockPluginAPI.getTasks.mockResolvedValue(spTasks);
      mockPluginAPI.getAllProjects.mockResolvedValue([
        { id: 'proj1', title: 'Project 1', taskIds: ['parent1'] },
      ]);

      mockPluginAPI.batchUpdateForProject.mockResolvedValue({
        success: true,
        createdTaskIds: {},
      });

      await fileWatcher.performSync(undefined, undefined, 'file');

      // Should update the checked state in notes
      expect(mockPluginAPI.batchUpdateForProject).toHaveBeenCalledWith({
        projectId: 'proj1',
        operations: expect.arrayContaining([
          {
            type: 'update',
            taskId: 'subtask1',
            updates: { notes: '    - [x] Completed checklist item' },
          },
        ]),
      });
    });

    it('should sync all third-level content as notes regardless of format', async () => {
      // Markdown with various third-level content
      const markdown = `- [ ] <!-- sp:parent1 --> Parent Task
  - [ ] <!-- sp:subtask1 --> Subtask with mixed notes
    - [ ] A checklist item
    Regular text content
    - Another bullet point
    1. Numbered list item`;

      mockFileOps.readFile.mockResolvedValue(markdown);

      const spTasks = [
        {
          id: 'parent1',
          title: 'Parent Task',
          isDone: false,
          subTaskIds: ['subtask1'],
        },
        {
          id: 'subtask1',
          title: 'Subtask with mixed notes',
          isDone: false,
          parentId: 'parent1',
          notes: 'Old notes content',
        },
      ];

      mockPluginAPI.getTasks.mockResolvedValue(spTasks);
      mockPluginAPI.getAllProjects.mockResolvedValue([
        { id: 'proj1', title: 'Project 1', taskIds: ['parent1'] },
      ]);

      mockPluginAPI.batchUpdateForProject.mockResolvedValue({
        success: true,
        createdTaskIds: {},
      });

      await fileWatcher.performSync(undefined, undefined, 'file');

      // Should update subtask notes with all third-level content
      expect(mockPluginAPI.batchUpdateForProject).toHaveBeenCalledWith({
        projectId: 'proj1',
        operations: expect.arrayContaining([
          {
            type: 'update',
            taskId: 'subtask1',
            updates: {
              notes:
                '    - [ ] A checklist item\n    Regular text content\n    - Another bullet point\n    1. Numbered list item',
            },
          },
        ]),
      });
    });
  });
});
