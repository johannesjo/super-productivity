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

describe('Orphaned Tasks Handling', () => {
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

  it('should create orphaned tasks as new tasks when parent is deleted', async () => {
    // Markdown contains tasks with IDs that no longer exist in SP
    const markdown = `- [ ] <!-- sp:deleted-parent --> Deleted Parent Task
  - [ ] <!-- sp:orphan1 --> Orphaned Subtask 1
  - [ ] <!-- sp:orphan2 --> Orphaned Subtask 2`;

    mockFileOps.readFile.mockResolvedValue(markdown);

    // SP has no tasks (all were deleted)
    const spTasks: any[] = [];

    mockPluginAPI.getTasks.mockResolvedValue(spTasks);
    mockPluginAPI.getAllProjects.mockResolvedValue([
      { id: 'proj1', title: 'Project 1', taskIds: [] },
    ]);

    mockPluginAPI.batchUpdateForProject.mockResolvedValue({
      success: true,
      createdTaskIds: {
        temp_1: 'new-parent-id',
        temp_2: 'new-orphan1-id',
        temp_3: 'new-orphan2-id',
      },
    });

    await fileWatcher.performSync(undefined, undefined, 'file');

    // Should create all three tasks as new tasks
    expect(mockPluginAPI.batchUpdateForProject).toHaveBeenCalledWith({
      projectId: 'proj1',
      operations: expect.arrayContaining([
        {
          type: 'create',
          tempId: expect.stringContaining('temp_'),
          data: {
            title: 'Deleted Parent Task',
            isDone: false,
            parentId: null,
          },
        },
        {
          type: 'create',
          tempId: expect.stringContaining('temp_'),
          data: {
            title: 'Orphaned Subtask 1',
            isDone: false,
            parentId: expect.stringContaining('temp_'), // Should link to parent's temp ID
          },
        },
        {
          type: 'create',
          tempId: expect.stringContaining('temp_'),
          data: {
            title: 'Orphaned Subtask 2',
            isDone: false,
            parentId: expect.stringContaining('temp_'), // Should link to parent's temp ID
          },
        },
      ]),
    });
  });

  it('should maintain parent-child relationship when parent exists', async () => {
    // Markdown contains an orphaned subtask but its parent exists in SP
    const markdown = `- [ ] <!-- sp:parent1 --> Existing Parent
  - [ ] <!-- sp:orphan1 --> Orphaned Subtask`;

    mockFileOps.readFile.mockResolvedValue(markdown);

    // SP has the parent but not the subtask
    const spTasks = [
      {
        id: 'parent1',
        title: 'Existing Parent',
        isDone: false,
        subTaskIds: [],
      },
    ];

    mockPluginAPI.getTasks.mockResolvedValue(spTasks);
    mockPluginAPI.getAllProjects.mockResolvedValue([
      { id: 'proj1', title: 'Project 1', taskIds: ['parent1'] },
    ]);

    mockPluginAPI.batchUpdateForProject.mockResolvedValue({
      success: true,
      createdTaskIds: { temp_1: 'new-orphan1-id' },
    });

    await fileWatcher.performSync(undefined, undefined, 'file');

    // Should create the orphaned subtask with correct parent
    expect(mockPluginAPI.batchUpdateForProject).toHaveBeenCalledWith({
      projectId: 'proj1',
      operations: expect.arrayContaining([
        {
          type: 'create',
          tempId: expect.stringContaining('temp_'),
          data: {
            title: 'Orphaned Subtask',
            isDone: false,
            parentId: 'parent1', // Parent exists, maintain relationship
          },
        },
      ]),
    });
  });

  it('should handle deeply nested orphaned tasks', async () => {
    // Complex scenario with mixed existing and orphaned tasks
    const markdown = `- [ ] <!-- sp:root1 --> Root Task (exists)
  - [ ] <!-- sp:child1 --> Child 1 (exists)
    - [ ] <!-- sp:orphan1 --> Orphaned Grandchild
  - [ ] <!-- sp:orphan2 --> Orphaned Child
- [ ] <!-- sp:orphan-root --> Orphaned Root Task`;

    mockFileOps.readFile.mockResolvedValue(markdown);

    // SP only has root1 and child1
    const spTasks = [
      {
        id: 'root1',
        title: 'Root Task (exists)',
        isDone: false,
        subTaskIds: ['child1'],
      },
      {
        id: 'child1',
        title: 'Child 1 (exists)',
        isDone: false,
        parentId: 'root1',
        subTaskIds: [],
      },
    ];

    mockPluginAPI.getTasks.mockResolvedValue(spTasks);
    mockPluginAPI.getAllProjects.mockResolvedValue([
      { id: 'proj1', title: 'Project 1', taskIds: ['root1'] },
    ]);

    mockPluginAPI.batchUpdateForProject.mockResolvedValue({
      success: true,
      createdTaskIds: {
        temp_1: 'new-orphan1-id',
        temp_2: 'new-orphan2-id',
        temp_3: 'new-orphan-root-id',
      },
    });

    await fileWatcher.performSync(undefined, undefined, 'file');

    // Should update child1 with notes and create orphaned tasks
    // The orphaned grandchild is now treated as notes (third level)
    expect(mockPluginAPI.batchUpdateForProject).toHaveBeenCalledWith({
      projectId: 'proj1',
      operations: expect.arrayContaining([
        {
          type: 'update',
          taskId: 'child1',
          updates: {
            notes: '    - [ ] <!-- sp:orphan1 --> Orphaned Grandchild',
          },
        },
        {
          type: 'create',
          tempId: expect.stringContaining('temp_'),
          data: {
            title: 'Orphaned Child',
            isDone: false,
            parentId: 'root1', // Parent exists
          },
        },
        {
          type: 'create',
          tempId: expect.stringContaining('temp_'),
          data: {
            title: 'Orphaned Root Task',
            isDone: false,
            parentId: null, // Root level
          },
        },
      ]),
    });
  });

  it('should handle completed orphaned tasks', async () => {
    const markdown = `- [x] <!-- sp:orphan1 --> Completed Orphaned Task`;

    mockFileOps.readFile.mockResolvedValue(markdown);

    const spTasks: any[] = [];

    mockPluginAPI.getTasks.mockResolvedValue(spTasks);
    mockPluginAPI.getAllProjects.mockResolvedValue([
      { id: 'proj1', title: 'Project 1', taskIds: [] },
    ]);

    mockPluginAPI.batchUpdateForProject.mockResolvedValue({
      success: true,
      createdTaskIds: { temp_1: 'new-id' },
    });

    await fileWatcher.performSync(undefined, undefined, 'file');

    // Should preserve the completed state
    expect(mockPluginAPI.batchUpdateForProject).toHaveBeenCalledWith({
      projectId: 'proj1',
      operations: expect.arrayContaining([
        {
          type: 'create',
          tempId: expect.stringContaining('temp_'),
          data: {
            title: 'Completed Orphaned Task',
            isDone: true,
            parentId: null,
          },
        },
      ]),
    });
  });

  it('should maintain parent-child relationships between multiple orphaned tasks', async () => {
    // All tasks are orphaned but have parent-child relationships in markdown
    const markdown = `- [ ] <!-- sp:orphan-parent --> Orphaned Parent
  - [ ] <!-- sp:orphan-child1 --> Orphaned Child 1
  - [ ] <!-- sp:orphan-child2 --> Orphaned Child 2
    - [ ] <!-- sp:orphan-grandchild --> Orphaned Grandchild`;

    mockFileOps.readFile.mockResolvedValue(markdown);

    // SP has no tasks
    const spTasks: any[] = [];

    mockPluginAPI.getTasks.mockResolvedValue(spTasks);
    mockPluginAPI.getAllProjects.mockResolvedValue([
      { id: 'proj1', title: 'Project 1', taskIds: [] },
    ]);

    mockPluginAPI.batchUpdateForProject.mockResolvedValue({
      success: true,
      createdTaskIds: {
        temp_1: 'new-parent',
        temp_2: 'new-child1',
        temp_3: 'new-child2',
      },
    });

    await fileWatcher.performSync(undefined, undefined, 'file');

    // Check that proper parent-child relationships are maintained
    const calls = mockPluginAPI.batchUpdateForProject.mock.calls;
    expect(calls).toHaveLength(1);
    const operations = calls[0][0].operations;

    // Find operations by title
    const parentOp = operations.find((op: any) => op.data?.title === 'Orphaned Parent');
    const child1Op = operations.find((op: any) => op.data?.title === 'Orphaned Child 1');
    const child2Op = operations.find((op: any) => op.data?.title === 'Orphaned Child 2');
    // Grandchild is now notes, not a separate task

    expect(parentOp).toBeDefined();
    expect(child1Op).toBeDefined();
    expect(child2Op).toBeDefined();

    // Verify relationships
    expect(parentOp.data.parentId).toBeNull();
    expect(child1Op.data.parentId).toBe(parentOp.tempId);
    expect(child2Op.data.parentId).toBe(parentOp.tempId);
    // Child2 should have notes containing the grandchild
    expect(child2Op.data.notes).toBe(
      '    - [ ] <!-- sp:orphan-grandchild --> Orphaned Grandchild',
    );
  });
});
