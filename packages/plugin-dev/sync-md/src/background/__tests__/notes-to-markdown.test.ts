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

describe('Notes to Markdown Conversion', () => {
  let fileWatcher: FileWatcherBatch;
  let mockFileOps: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock file operations
    mockFileOps = {
      readFile: jest.fn(),
      writeFile: jest.fn(),
    };

    const config: SyncConfig = {
      enabled: true,
      filePath: '/test/tasks.md',
      projectId: 'proj1',
      syncDirection: 'projectToFile',
    };

    fileWatcher = new FileWatcherBatch({ config }, mockFileOps);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should convert checklist items in task.notes to nested markdown tasks', async () => {
    // Current markdown (empty or minimal)
    mockFileOps.readFile.mockResolvedValue('');

    // SP tasks with notes containing checklist items
    const spTasks = [
      {
        id: 'task1',
        title: 'Task with checklist notes',
        isDone: false,
        notes:
          '- [ ] First checklist item\n- [x] Completed checklist item\n- [ ] Third item',
      },
    ];

    mockPluginAPI.getTasks.mockResolvedValue(spTasks);
    mockPluginAPI.getAllProjects.mockResolvedValue([
      { id: 'proj1', title: 'Project 1', taskIds: ['task1'] },
    ]);

    await fileWatcher.performSync(undefined, undefined, 'sp');

    // Fast-forward time to trigger the delayed write
    jest.advanceTimersByTime(2000);
    await Promise.resolve();
    await Promise.resolve();

    // Should write markdown with checklist items as notes (4 spaces indent)
    expect(mockFileOps.writeFile).toHaveBeenCalledWith(
      '/test/tasks.md',
      `- [ ] <!-- sp:task1 --> Task with checklist notes
    - [ ] First checklist item
    - [x] Completed checklist item
    - [ ] Third item`,
    );
  });

  it('should only add notes for leaf tasks (not for tasks with subtasks)', async () => {
    mockFileOps.readFile.mockResolvedValue('');

    const spTasks = [
      {
        id: 'parent1',
        title: 'Parent with notes and subtasks',
        isDone: false,
        notes: '- [ ] This should be ignored',
        subTaskIds: ['sub1'],
      },
      {
        id: 'sub1',
        title: 'Subtask with notes',
        isDone: false,
        parentId: 'parent1',
        notes: '- [ ] This should appear\n- [x] Completed item',
      },
    ];

    mockPluginAPI.getTasks.mockResolvedValue(spTasks);
    mockPluginAPI.getAllProjects.mockResolvedValue([
      { id: 'proj1', title: 'Project 1', taskIds: ['parent1'] },
    ]);

    await fileWatcher.performSync(undefined, undefined, 'sp');

    jest.advanceTimersByTime(2000);
    await Promise.resolve();
    await Promise.resolve();

    const expectedMarkdown = `- [ ] <!-- sp:parent1 --> Parent with notes and subtasks
  - [ ] <!-- sp:sub1 --> Subtask with notes
    - [ ] This should appear
    - [x] Completed item`;

    expect(mockFileOps.writeFile).toHaveBeenCalledWith(
      '/test/tasks.md',
      expect.stringContaining(expectedMarkdown),
    );

    // Should NOT contain the parent's notes
    expect(mockFileOps.writeFile).toHaveBeenCalledWith(
      '/test/tasks.md',
      expect.not.stringContaining('This should be ignored'),
    );
  });

  it('should handle mixed content in notes (checklist and regular text)', async () => {
    mockFileOps.readFile.mockResolvedValue('');

    const spTasks = [
      {
        id: 'task1',
        title: 'Task with mixed notes',
        isDone: false,
        notes:
          '- [ ] Checklist item 1\nRegular note line\n- [x] Checklist item 2\nAnother regular line',
      },
    ];

    mockPluginAPI.getTasks.mockResolvedValue(spTasks);
    mockPluginAPI.getAllProjects.mockResolvedValue([
      { id: 'proj1', title: 'Project 1', taskIds: ['task1'] },
    ]);

    await fileWatcher.performSync(undefined, undefined, 'sp');

    jest.advanceTimersByTime(2000);
    await Promise.resolve();
    await Promise.resolve();

    expect(mockFileOps.writeFile).toHaveBeenCalledWith(
      '/test/tasks.md',
      `- [ ] <!-- sp:task1 --> Task with mixed notes
    - [ ] Checklist item 1
Regular note line
    - [x] Checklist item 2
Another regular line`,
    );
  });

  it('should handle empty notes gracefully', async () => {
    mockFileOps.readFile.mockResolvedValue('');

    const spTasks = [
      {
        id: 'task1',
        title: 'Task without notes',
        isDone: false,
        notes: '',
      },
      {
        id: 'task2',
        title: 'Task with null notes',
        isDone: false,
        notes: null,
      },
      {
        id: 'task3',
        title: 'Task with whitespace notes',
        isDone: false,
        notes: '   \n  \n   ',
      },
    ];

    mockPluginAPI.getTasks.mockResolvedValue(spTasks);
    mockPluginAPI.getAllProjects.mockResolvedValue([
      { id: 'proj1', title: 'Project 1', taskIds: ['task1', 'task2', 'task3'] },
    ]);

    await fileWatcher.performSync(undefined, undefined, 'sp');

    jest.advanceTimersByTime(2000);
    await Promise.resolve();
    await Promise.resolve();

    // Should write tasks without any nested items
    expect(mockFileOps.writeFile).toHaveBeenCalledWith(
      '/test/tasks.md',
      `- [ ] <!-- sp:task1 --> Task without notes
- [ ] <!-- sp:task2 --> Task with null notes
- [ ] <!-- sp:task3 --> Task with whitespace notes`,
    );
  });

  it('should maintain proper indentation for deeply nested tasks with notes', async () => {
    mockFileOps.readFile.mockResolvedValue('');

    const spTasks = [
      {
        id: 'task1',
        title: 'Level 1',
        isDone: false,
        subTaskIds: ['task2'],
      },
      {
        id: 'task2',
        title: 'Level 2',
        isDone: false,
        parentId: 'task1',
        subTaskIds: ['task3'],
      },
      {
        id: 'task3',
        title: 'Level 3 with notes',
        isDone: false,
        parentId: 'task2',
        notes: '- [ ] Nested checklist item',
      },
    ];

    mockPluginAPI.getTasks.mockResolvedValue(spTasks);
    mockPluginAPI.getAllProjects.mockResolvedValue([
      { id: 'proj1', title: 'Project 1', taskIds: ['task1'] },
    ]);

    await fileWatcher.performSync(undefined, undefined, 'sp');

    jest.advanceTimersByTime(2000);
    await Promise.resolve();
    await Promise.resolve();

    expect(mockFileOps.writeFile).toHaveBeenCalledWith(
      '/test/tasks.md',
      `- [ ] <!-- sp:task1 --> Level 1
  - [ ] <!-- sp:task2 --> Level 2
    - [ ] <!-- sp:task3 --> Level 3 with notes
    - [ ] Nested checklist item`,
    );
  });
});
