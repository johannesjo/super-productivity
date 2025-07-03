import { FileWatcherBatch } from '../file-watcher';
import { SyncConfig } from '../../shared/types';

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
class MockFileOperations {
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

  getFileContent(): string {
    return this.fileContent;
  }
}

describe('Notes Indentation Fix', () => {
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
    jest.useFakeTimers();
    mockFileOps = new MockFileOperations();
    fileWatcher = new FileWatcherBatch({ config }, mockFileOps as any);

    mockPluginAPI.getAllProjects.mockResolvedValue([
      { id: 'test-project', taskIds: ['task1'] },
    ]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should not add extra indentation when writing notes back to markdown', async () => {
    // Initial markdown with notes at various indentation levels
    const initialMarkdown = `- [ ] <!-- sp:task1 --> Parent Task
  - [ ] <!-- sp:task2 --> Subtask with notes
    This is a note with 4 spaces
No indent note
        Note with 8 spaces
  Regular 2 space indent`;

    mockFileOps.setFileContent(initialMarkdown);

    // SP tasks that match the markdown
    const spTasks = [
      {
        id: 'task1',
        title: 'Parent Task',
        isDone: false,
        subTaskIds: ['task2'],
      },
      {
        id: 'task2',
        title: 'Subtask with notes',
        isDone: false,
        parentId: 'task1',
        notes: `    This is a note with 4 spaces
No indent note
        Note with 8 spaces
  Regular 2 space indent`,
      },
    ];

    mockPluginAPI.getTasks.mockResolvedValue(spTasks);

    // Sync from SP to file
    await fileWatcher.performSync(undefined, undefined, 'sp');

    // Fast-forward timers to trigger the write
    jest.advanceTimersByTime(2000);
    await Promise.resolve();

    // The written content should have the same indentation as the original
    const writtenContent = mockFileOps.getFileContent();
    expect(writtenContent).toBe(`- [ ] <!-- sp:task1 --> Parent Task
  - [ ] <!-- sp:task2 --> Subtask with notes
    This is a note with 4 spaces
No indent note
        Note with 8 spaces
  Regular 2 space indent`);
  });

  it('should handle multiple save cycles without increasing indentation', async () => {
    // Start with empty file
    mockFileOps.setFileContent('');

    const spTasks = [
      {
        id: 'task1',
        title: 'Task',
        isDone: false,
        subTaskIds: ['task2'],
      },
      {
        id: 'task2',
        title: 'Subtask',
        isDone: false,
        parentId: 'task1',
        notes: '    Indented note\nUnindented note',
      },
    ];

    mockPluginAPI.getTasks.mockResolvedValue(spTasks);

    // First save (from empty to initial content)
    await fileWatcher.performSync(undefined, undefined, 'sp');

    // Wait for all timers and microtasks
    jest.advanceTimersByTime(2500);
    await Promise.resolve();
    await Promise.resolve(); // Double resolve for any pending microtasks

    const firstSave = mockFileOps.getFileContent();
    expect(firstSave).toBe(`- [ ] <!-- sp:task1 --> Task
  - [ ] <!-- sp:task2 --> Subtask
    Indented note
Unindented note`);

    // Simulate a change in SP (mark task as done) to trigger another write
    spTasks[1].isDone = true;
    mockPluginAPI.getTasks.mockResolvedValue(spTasks);

    // Second save with modified task
    await fileWatcher.performSync(undefined, undefined, 'sp');
    jest.advanceTimersByTime(2000);
    await Promise.resolve();
    await Promise.resolve(); // Extra resolve for async operations

    const secondSave = mockFileOps.getFileContent();

    // Notes indentation should remain the same, only the checkbox should change
    expect(secondSave).toBe(`- [ ] <!-- sp:task1 --> Task
  - [x] <!-- sp:task2 --> Subtask
    Indented note
Unindented note`);

    // Verify notes haven't gained extra indentation
    expect(secondSave).toContain('    Indented note\nUnindented note');
  });

  it('should skip writing when there are no changes', async () => {
    const markdown = `- [ ] <!-- sp:task1 --> Task
  - [ ] <!-- sp:task2 --> Subtask
    Some notes here`;

    mockFileOps.setFileContent(markdown);

    const spTasks = [
      {
        id: 'task1',
        title: 'Task',
        isDone: false,
        subTaskIds: ['task2'],
      },
      {
        id: 'task2',
        title: 'Subtask',
        isDone: false,
        parentId: 'task1',
        notes: '    Some notes here',
      },
    ];

    mockPluginAPI.getTasks.mockResolvedValue(spTasks);

    // Create a spy on writeFile
    const writeFileSpy = jest.spyOn(mockFileOps, 'writeFile');

    // Perform sync
    await fileWatcher.performSync(undefined, undefined, 'sp');
    jest.advanceTimersByTime(2000);
    await Promise.resolve();

    // writeFile should NOT have been called since content is identical
    expect(writeFileSpy).not.toHaveBeenCalled();

    // Content should remain unchanged
    expect(mockFileOps.getFileContent()).toBe(markdown);
  });

  it('should ensure checklist items in notes have minimum 4 spaces indentation', async () => {
    // Start with empty file
    mockFileOps.setFileContent('');

    const spTasks = [
      {
        id: 'task1',
        title: 'Task with checklist notes',
        isDone: false,
        notes: `- [ ] No indent checklist
  - [ ] Two space indent checklist
    - [ ] Four space indent checklist
Regular text with no indent
  Regular text with indent`,
      },
    ];

    mockPluginAPI.getTasks.mockResolvedValue(spTasks);
    mockPluginAPI.getAllProjects.mockResolvedValue([
      { id: 'test-project', taskIds: ['task1'] },
    ]);

    await fileWatcher.performSync(undefined, undefined, 'sp');
    jest.advanceTimersByTime(2500);
    await Promise.resolve();
    await Promise.resolve(); // Extra resolve for async operations

    const result = mockFileOps.getFileContent();

    // Checklist items should have minimum 4 spaces
    expect(result).toBe(`- [ ] <!-- sp:task1 --> Task with checklist notes
    - [ ] No indent checklist
    - [ ] Two space indent checklist
    - [ ] Four space indent checklist
Regular text with no indent
  Regular text with indent`);
  });
});
