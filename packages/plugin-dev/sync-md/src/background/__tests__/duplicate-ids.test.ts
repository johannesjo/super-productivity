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

describe('Duplicate IDs Handling', () => {
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

  it('should handle duplicate IDs and maintain parent-child relationships', async () => {
    // Markdown with duplicate IDs
    const markdown = `- [ ] <!-- sp:dup-id --> Task 1
- [ ] <!-- sp:dup-id --> Task 2
- [ ] <!-- sp:dup-id --> Task 3
- [ ] <!-- sp:dup-id --> Task 4
  - [ ] <!-- sp:child-id --> Subtask of Task 4`;

    mockFileOps.readFile.mockResolvedValue(markdown);

    // Only the first task with dup-id exists in SP
    const spTasks = [
      {
        id: 'dup-id',
        title: 'Task 1',
        isDone: false,
      },
    ];

    mockPluginAPI.getTasks.mockResolvedValue(spTasks);
    mockPluginAPI.getAllProjects.mockResolvedValue([
      { id: 'proj1', title: 'Project 1', taskIds: ['dup-id'] },
    ]);

    mockPluginAPI.batchUpdateForProject.mockResolvedValue({
      success: true,
      createdTaskIds: {
        temp_1: 'new-task2',
        temp_2: 'new-task3',
        temp_3: 'new-task4',
        temp_4: 'new-child',
      },
    });

    await fileWatcher.performSync(undefined, undefined, 'file');

    // Should show warning about duplicate IDs
    const warningCall = mockPluginAPI.showSnack.mock.calls.find(
      (call) => call[0].type === 'WARNING' && call[0].msg.includes('duplicate task IDs'),
    );
    expect(warningCall).toBeDefined();
    expect(warningCall[0]).toEqual({
      msg: 'Found duplicate task IDs: dup-id. These tasks will be treated as new tasks.',
      type: 'WARNING',
    });

    // Should create operations
    const calls = mockPluginAPI.batchUpdateForProject.mock.calls;
    expect(calls).toHaveLength(1);
    const operations = calls[0][0].operations;

    // Find operations
    const createOps = operations.filter((op: any) => op.type === 'create');
    expect(createOps).toHaveLength(4); // Task 2, 3, 4, and child

    // Task 4 should be created
    const task4Op = createOps.find((op: any) => op.data?.title === 'Task 4');
    expect(task4Op).toBeDefined();

    // Subtask should be created with Task 4's temp ID as parent
    const childOp = createOps.find((op: any) => op.data?.title === 'Subtask of Task 4');
    expect(childOp).toBeDefined();

    // The child's parent should be task4's temp ID
    expect(childOp.data.parentId).toBe(task4Op.tempId);
  });

  it('should handle all tasks having the same duplicate ID', async () => {
    // All tasks have the same ID
    const markdown = `- [ ] <!-- sp:same-id --> Parent 1
  - [ ] <!-- sp:same-id --> Child of Parent 1
- [ ] <!-- sp:same-id --> Parent 2
  - [ ] <!-- sp:another-id --> Child of Parent 2`;

    mockFileOps.readFile.mockResolvedValue(markdown);

    // None of these exist in SP
    const spTasks: any[] = [];

    mockPluginAPI.getTasks.mockResolvedValue(spTasks);
    mockPluginAPI.getAllProjects.mockResolvedValue([
      { id: 'proj1', title: 'Project 1', taskIds: [] },
    ]);

    mockPluginAPI.batchUpdateForProject.mockResolvedValue({
      success: true,
      createdTaskIds: {},
    });

    await fileWatcher.performSync(undefined, undefined, 'file');

    const calls = mockPluginAPI.batchUpdateForProject.mock.calls;
    expect(calls).toHaveLength(1);
    const operations = calls[0][0].operations;

    // All tasks should be created
    const createOps = operations.filter((op: any) => op.type === 'create');
    expect(createOps).toHaveLength(4);

    // Verify parent-child relationships based on indentation
    const parent1Op = createOps.find((op: any) => op.data?.title === 'Parent 1');
    const child1Op = createOps.find((op: any) => op.data?.title === 'Child of Parent 1');
    const parent2Op = createOps.find((op: any) => op.data?.title === 'Parent 2');
    const child2Op = createOps.find((op: any) => op.data?.title === 'Child of Parent 2');

    expect(parent1Op.data.parentId).toBeNull();
    expect(parent2Op.data.parentId).toBeNull();

    // Children should maintain their parent relationships
    expect(child1Op.data.parentId).toBe(parent1Op.tempId);
    expect(child2Op.data.parentId).toBe(parent2Op.tempId);
  });
});
