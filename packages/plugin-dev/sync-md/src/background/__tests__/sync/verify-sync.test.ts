import { verifySyncState, logSyncVerification } from '../../sync/verify-sync';
import { LocalUserCfg } from '../../local-config';
import * as fileUtils from '../../helper/file-utils';
import { Task } from '@super-productivity/plugin-api';

// Mock dependencies
jest.mock('../../helper/file-utils');

// Mock PluginAPI
(global as any).PluginAPI = {
  getTasks: jest.fn(),
  getAllProjects: jest.fn(),
} as any;

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('verifySyncState', () => {
  const mockConfig: LocalUserCfg = {
    filePath: '/test/tasks.md',
    projectId: 'test-project',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
  });

  afterAll(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  it('should return isInSync true when SP and MD are identical', async () => {
    const mockTasks: Task[] = [
      {
        id: 'task1',
        title: 'Task 1',
        isDone: false,
        projectId: 'test-project',
        parentId: null,
      } as Task,
      {
        id: 'task2',
        title: 'Task 2',
        isDone: true,
        projectId: 'test-project',
        parentId: null,
      } as Task,
    ];

    const mockMarkdown = `- [ ] <!--task1--> Task 1
- [x] <!--task2--> Task 2`;

    ((global as any).PluginAPI.getTasks as jest.Mock).mockResolvedValue(mockTasks);
    ((global as any).PluginAPI.getAllProjects as jest.Mock).mockResolvedValue([]);
    (fileUtils.readTasksFile as jest.Mock).mockResolvedValue(mockMarkdown);

    const result = await verifySyncState(mockConfig);

    expect(result.isInSync).toBe(true);
    expect(result.differences).toHaveLength(0);
  });

  it('should detect missing tasks in markdown', async () => {
    const mockTasks: Task[] = [
      {
        id: 'task1',
        title: 'Task 1',
        isDone: false,
        projectId: 'test-project',
        parentId: null,
      } as Task,
      {
        id: 'task2',
        title: 'Task 2',
        isDone: false,
        projectId: 'test-project',
        parentId: null,
      } as Task,
    ];

    const mockMarkdown = `- [ ] <!--task1--> Task 1`;

    ((global as any).PluginAPI.getTasks as jest.Mock).mockResolvedValue(mockTasks);
    ((global as any).PluginAPI.getAllProjects as jest.Mock).mockResolvedValue([]);
    (fileUtils.readTasksFile as jest.Mock).mockResolvedValue(mockMarkdown);

    const result = await verifySyncState(mockConfig);

    expect(result.isInSync).toBe(false);
    expect(result.differences).toHaveLength(1);
    expect(result.differences[0]).toEqual({
      type: 'missing-in-md',
      taskId: 'task2',
      message: 'Task "Task 2" exists in SP but not in markdown',
    });
  });

  it('should detect missing tasks in SP', async () => {
    const mockTasks: Task[] = [
      {
        id: 'task1',
        title: 'Task 1',
        isDone: false,
        projectId: 'test-project',
        parentId: null,
      } as Task,
    ];

    const mockMarkdown = `- [ ] <!--task1--> Task 1
- [ ] <!--task2--> Task 2`;

    ((global as any).PluginAPI.getTasks as jest.Mock).mockResolvedValue(mockTasks);
    ((global as any).PluginAPI.getAllProjects as jest.Mock).mockResolvedValue([]);
    (fileUtils.readTasksFile as jest.Mock).mockResolvedValue(mockMarkdown);

    const result = await verifySyncState(mockConfig);

    expect(result.isInSync).toBe(false);
    expect(result.differences).toHaveLength(1);
    expect(result.differences[0]).toEqual({
      type: 'missing-in-sp',
      taskId: 'task2',
      message: 'Task "Task 2" exists in markdown but not in SP',
    });
  });

  it('should detect title mismatches', async () => {
    const mockTasks: Task[] = [
      {
        id: 'task1',
        title: 'Task 1 SP',
        isDone: false,
        projectId: 'test-project',
        parentId: null,
      } as Task,
    ];

    const mockMarkdown = `- [ ] <!--task1--> Task 1 MD`;

    ((global as any).PluginAPI.getTasks as jest.Mock).mockResolvedValue(mockTasks);
    ((global as any).PluginAPI.getAllProjects as jest.Mock).mockResolvedValue([]);
    (fileUtils.readTasksFile as jest.Mock).mockResolvedValue(mockMarkdown);

    const result = await verifySyncState(mockConfig);

    expect(result.isInSync).toBe(false);
    expect(result.differences).toHaveLength(1);
    expect(result.differences[0]).toEqual({
      type: 'property-mismatch',
      taskId: 'task1',
      message: 'Title mismatch for task task1',
      details: { sp: 'Task 1 SP', md: 'Task 1 MD' },
    });
  });

  it('should detect completion status mismatches', async () => {
    const mockTasks: Task[] = [
      {
        id: 'task1',
        title: 'Task 1',
        isDone: true,
        projectId: 'test-project',
        parentId: null,
      } as Task,
    ];

    const mockMarkdown = `- [ ] <!--task1--> Task 1`;

    ((global as any).PluginAPI.getTasks as jest.Mock).mockResolvedValue(mockTasks);
    ((global as any).PluginAPI.getAllProjects as jest.Mock).mockResolvedValue([]);
    (fileUtils.readTasksFile as jest.Mock).mockResolvedValue(mockMarkdown);

    const result = await verifySyncState(mockConfig);

    expect(result.isInSync).toBe(false);
    expect(result.differences).toHaveLength(1);
    expect(result.differences[0]).toEqual({
      type: 'property-mismatch',
      taskId: 'task1',
      message: 'Completion status mismatch for task "Task 1"',
      details: { sp: true, md: false },
    });
  });

  it('should detect task order mismatches', async () => {
    const mockTasks: Task[] = [
      {
        id: 'task1',
        title: 'Task 1',
        isDone: false,
        projectId: 'test-project',
        parentId: null,
      } as Task,
      {
        id: 'task2',
        title: 'Task 2',
        isDone: false,
        projectId: 'test-project',
        parentId: null,
      } as Task,
    ];

    const mockProjects = [
      {
        id: 'test-project',
        title: 'Test Project',
        taskIds: ['task1', 'task2'],
      },
    ];

    const mockMarkdown = `- [ ] <!--task2--> Task 2
- [ ] <!--task1--> Task 1`;

    ((global as any).PluginAPI.getTasks as jest.Mock).mockResolvedValue(mockTasks);
    ((global as any).PluginAPI.getAllProjects as jest.Mock).mockResolvedValue(
      mockProjects,
    );
    (fileUtils.readTasksFile as jest.Mock).mockResolvedValue(mockMarkdown);

    const result = await verifySyncState(mockConfig);

    expect(result.isInSync).toBe(false);
    expect(result.differences).toHaveLength(1);
    expect(result.differences[0]).toEqual({
      type: 'order-mismatch',
      message: 'Parent task order mismatch',
      details: { sp: ['task1', 'task2'], md: ['task2', 'task1'] },
    });
  });

  it('should detect subtask order mismatches', async () => {
    const mockTasks: Task[] = [
      {
        id: 'parent1',
        title: 'Parent Task',
        isDone: false,
        projectId: 'test-project',
        parentId: null,
        subTaskIds: ['child1', 'child2'],
      } as Task,
      {
        id: 'child1',
        title: 'Child 1',
        isDone: false,
        projectId: 'test-project',
        parentId: 'parent1',
      } as Task,
      {
        id: 'child2',
        title: 'Child 2',
        isDone: false,
        projectId: 'test-project',
        parentId: 'parent1',
      } as Task,
    ];

    const mockMarkdown = `- [ ] <!--parent1--> Parent Task
  - [ ] <!--child2--> Child 2
  - [ ] <!--child1--> Child 1`;

    ((global as any).PluginAPI.getTasks as jest.Mock).mockResolvedValue(mockTasks);
    ((global as any).PluginAPI.getAllProjects as jest.Mock).mockResolvedValue([]);
    (fileUtils.readTasksFile as jest.Mock).mockResolvedValue(mockMarkdown);

    const result = await verifySyncState(mockConfig);

    expect(result.isInSync).toBe(false);
    expect(result.differences).toHaveLength(1);
    expect(result.differences[0]).toEqual({
      type: 'order-mismatch',
      taskId: 'parent1',
      message: 'Subtask order mismatch for task "Parent Task"',
      details: { sp: ['child1', 'child2'], md: ['child2', 'child1'] },
    });
  });

  it('should handle empty markdown file when SP has tasks', async () => {
    const mockTasks: Task[] = [
      {
        id: 'task1',
        title: 'Task 1',
        isDone: false,
        projectId: 'test-project',
        parentId: null,
      } as Task,
    ];

    ((global as any).PluginAPI.getTasks as jest.Mock).mockResolvedValue(mockTasks);
    ((global as any).PluginAPI.getAllProjects as jest.Mock).mockResolvedValue([]);
    (fileUtils.readTasksFile as jest.Mock).mockResolvedValue('');

    const result = await verifySyncState(mockConfig);

    expect(result.isInSync).toBe(false);
    expect(result.differences).toHaveLength(1);
    expect(result.differences[0]).toEqual({
      type: 'missing-in-md',
      message: 'Markdown file is empty but SP has 1 tasks',
    });
  });

  it('should treat null and undefined parentId as equivalent', async () => {
    const mockTasks: Task[] = [
      {
        id: 'task1',
        title: 'Task 1',
        isDone: false,
        projectId: 'test-project',
        parentId: undefined,
      } as Task,
      {
        id: 'task2',
        title: 'Task 2',
        isDone: false,
        projectId: 'test-project',
        parentId: null,
      } as Task,
    ];

    const mockMarkdown = `- [ ] <!--task1--> Task 1
- [ ] <!--task2--> Task 2`;

    ((global as any).PluginAPI.getTasks as jest.Mock).mockResolvedValue(mockTasks);
    ((global as any).PluginAPI.getAllProjects as jest.Mock).mockResolvedValue([]);
    (fileUtils.readTasksFile as jest.Mock).mockResolvedValue(mockMarkdown);

    const result = await verifySyncState(mockConfig);

    expect(result.isInSync).toBe(true);
    expect(result.differences).toHaveLength(0);
  });

  it('should detect notes mismatches', async () => {
    const mockTasks: Task[] = [
      {
        id: 'task1',
        title: 'Task 1',
        isDone: false,
        projectId: 'test-project',
        parentId: null,
        notes: 'SP notes',
      } as Task,
    ];

    const mockMarkdown = `- [ ] <!--task1--> Task 1
  MD notes`;

    ((global as any).PluginAPI.getTasks as jest.Mock).mockResolvedValue(mockTasks);
    ((global as any).PluginAPI.getAllProjects as jest.Mock).mockResolvedValue([]);
    (fileUtils.readTasksFile as jest.Mock).mockResolvedValue(mockMarkdown);

    const result = await verifySyncState(mockConfig);

    expect(result.isInSync).toBe(false);
    expect(result.differences).toHaveLength(1);
    expect(result.differences[0]).toEqual({
      type: 'property-mismatch',
      taskId: 'task1',
      message: 'Notes mismatch for task "Task 1"',
      details: { sp: 'SP notes', md: 'MD notes' },
    });
  });
});

describe('logSyncVerification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
  });

  afterAll(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  it('should log success when in sync', () => {
    const result = {
      isInSync: true,
      differences: [],
    };

    logSyncVerification(result, 'after SP to MD sync');

    expect(console.log).toHaveBeenCalledWith(
      '✅ Sync verification passed: after SP to MD sync',
    );
    expect(console.error).not.toHaveBeenCalled();
  });

  it('should log errors when not in sync', () => {
    const result = {
      isInSync: false,
      differences: [
        {
          type: 'missing-in-md' as const,
          taskId: 'task1',
          message: 'Task "Task 1" exists in SP but not in markdown',
        },
        {
          type: 'property-mismatch' as const,
          taskId: 'task2',
          message: 'Title mismatch for task task2',
          details: { sp: 'Title SP', md: 'Title MD' },
        },
      ],
    };

    logSyncVerification(result, 'after MD to SP sync');

    expect(console.log).toHaveBeenCalledWith(
      '❌ Sync verification failed: after MD to SP sync',
    );
    expect(console.log).toHaveBeenCalledWith('Found 2 differences:');
    expect(console.log).toHaveBeenCalledWith(
      '  - missing-in-md: Task "Task 1" exists in SP but not in markdown',
    );
    expect(console.log).toHaveBeenCalledWith(
      '  - property-mismatch: Title mismatch for task task2',
    );
    expect(console.log).toHaveBeenCalledWith('    Details:', {
      sp: 'Title SP',
      md: 'Title MD',
    });
  });
});
