import { spToMd } from '../../sync/sp-to-md';
import { LocalUserCfg } from '../../local-config';
import * as fileUtils from '../../helper/file-utils';
import { Task } from '@super-productivity/plugin-api';

// Mock dependencies
jest.mock('../../helper/file-utils');
jest.mock('../../../shared/logger', () => ({
  log: {
    critical: jest.fn(),
    err: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
    normal: jest.fn(),
    info: jest.fn(),
    verbose: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock PluginAPI
(global as any).PluginAPI = {
  getTasks: jest.fn(),
  getAllProjects: jest.fn(),
  log: {
    critical: jest.fn(),
    err: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
    normal: jest.fn(),
    info: jest.fn(),
    verbose: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
  persistDataSynced: jest.fn(),
  loadSyncedData: jest.fn(),
} as any;

describe('spToMd', () => {
  const mockConfig: LocalUserCfg = {
    filePath: '/test/tasks.md',
    projectId: 'test-project',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(fileUtils, 'ensureDirectoryExists').mockResolvedValue();
    jest.spyOn(fileUtils, 'writeTasksFile').mockResolvedValue();
  });

  it('should order tasks according to project taskIds', async () => {
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
      {
        id: 'task3',
        title: 'Task 3',
        isDone: false,
        projectId: 'test-project',
        parentId: null,
      } as Task,
      {
        id: 'other-task',
        title: 'Other Project Task',
        isDone: false,
        projectId: 'other-project',
        parentId: null,
      } as Task,
    ];

    const mockProjects = [
      {
        id: 'test-project',
        title: 'Test Project',
        // Tasks should be ordered: task3, task1, task2
        taskIds: ['task3', 'task1', 'task2'],
      },
    ];

    ((global as any).PluginAPI.getTasks as jest.Mock).mockResolvedValue(mockTasks);
    ((global as any).PluginAPI.getAllProjects as jest.Mock).mockResolvedValue(
      mockProjects,
    );

    await spToMd(mockConfig);

    // Verify the markdown was written with tasks in the correct order
    expect(fileUtils.writeTasksFile).toHaveBeenCalledWith(
      mockConfig.filePath,
      expect.stringContaining('Task 3'),
    );

    const writtenMarkdown = (fileUtils.writeTasksFile as jest.Mock).mock.calls[0][1];
    const lines = writtenMarkdown.split('\n');

    // Find the indices of each task
    const task1Index = lines.findIndex((line: string) => line.includes('Task 1'));
    const task2Index = lines.findIndex((line: string) => line.includes('Task 2'));
    const task3Index = lines.findIndex((line: string) => line.includes('Task 3'));

    // Verify the order matches project.taskIds: task3, task1, task2
    expect(task3Index).toBeLessThan(task1Index);
    expect(task1Index).toBeLessThan(task2Index);
  });

  it('should handle subtasks correctly when ordering by taskIds', async () => {
    const mockTasks: Task[] = [
      {
        id: 'parent1',
        title: 'Parent 1',
        isDone: false,
        projectId: 'test-project',
        parentId: null,
      } as Task,
      {
        id: 'parent2',
        title: 'Parent 2',
        isDone: false,
        projectId: 'test-project',
        parentId: null,
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
        parentId: 'parent2',
      } as Task,
    ];

    const mockProjects = [
      {
        id: 'test-project',
        title: 'Test Project',
        // Parent tasks should be ordered: parent2, parent1
        taskIds: ['parent2', 'parent1', 'child1', 'child2'], // Note: subtask IDs are included but should be ignored for parent ordering
      },
    ];

    ((global as any).PluginAPI.getTasks as jest.Mock).mockResolvedValue(mockTasks);
    ((global as any).PluginAPI.getAllProjects as jest.Mock).mockResolvedValue(
      mockProjects,
    );

    await spToMd(mockConfig);

    const writtenMarkdown = (fileUtils.writeTasksFile as jest.Mock).mock.calls[0][1];
    const lines = writtenMarkdown.split('\n');

    // Find parent tasks
    const parent1Index = lines.findIndex(
      (line: string) => line.includes('Parent 1') && !line.startsWith('  '),
    );
    const parent2Index = lines.findIndex(
      (line: string) => line.includes('Parent 2') && !line.startsWith('  '),
    );

    // Verify parent order matches project.taskIds
    expect(parent2Index).toBeLessThan(parent1Index);

    // Verify children are still under their parents
    const child1Index = lines.findIndex((line: string) => line.includes('Child 1'));
    const child2Index = lines.findIndex((line: string) => line.includes('Child 2'));

    expect(child1Index).toBeGreaterThan(parent1Index);
    expect(child2Index).toBeGreaterThan(parent2Index);
    expect(child2Index).toBeLessThan(parent1Index); // Child 2 should come before Parent 1
  });

  it('should fallback to unordered tasks when project has no taskIds', async () => {
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
        // No taskIds property
      },
    ];

    ((global as any).PluginAPI.getTasks as jest.Mock).mockResolvedValue(mockTasks);
    ((global as any).PluginAPI.getAllProjects as jest.Mock).mockResolvedValue(
      mockProjects,
    );

    await spToMd(mockConfig);

    // Should still write tasks (in whatever order they came from getTasks)
    expect(fileUtils.writeTasksFile).toHaveBeenCalledWith(
      mockConfig.filePath,
      expect.stringContaining('Task 1'),
    );
    expect(fileUtils.writeTasksFile).toHaveBeenCalledWith(
      mockConfig.filePath,
      expect.stringContaining('Task 2'),
    );
  });
});
