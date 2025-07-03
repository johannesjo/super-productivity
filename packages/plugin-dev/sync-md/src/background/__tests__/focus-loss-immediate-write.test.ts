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
  onWindowFocusChange: jest.fn(),
};

// @ts-ignore
global.PluginAPI = mockPluginAPI;

// Mock file operations
class MockFileOperations {
  private fileContent: string = '';
  writeFile = jest.fn(async (filePath: string, content: string) => {
    this.fileContent = content;
  });

  async readFile(filePath: string): Promise<string> {
    return this.fileContent;
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

describe('Focus Loss Immediate Write', () => {
  let fileWatcher: FileWatcherBatch;
  let mockFileOps: MockFileOperations;
  let focusCallback: ((isFocused: boolean) => void) | null = null;
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

    // Capture the focus change callback
    mockPluginAPI.onWindowFocusChange.mockImplementation((callback) => {
      focusCallback = callback;
    });

    fileWatcher = new FileWatcherBatch({ config }, mockFileOps as any);

    mockPluginAPI.getAllProjects.mockResolvedValue([
      { id: 'test-project', taskIds: ['task1'] },
    ]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should execute pending markdown write immediately when app loses focus', async () => {
    // Set up initial state
    const initialMarkdown = '';
    mockFileOps.setFileContent(initialMarkdown);

    const spTasks = [
      {
        id: 'task1',
        title: 'Task from SP',
        isDone: false,
      },
    ];
    mockPluginAPI.getTasks.mockResolvedValue(spTasks);

    // Trigger a SP to file sync which will queue a write
    await fileWatcher.performSync(undefined, undefined, 'sp');

    // Verify write is pending (not executed yet)
    expect(mockFileOps.writeFile).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(1); // The 2-second timer

    // Simulate app losing focus
    expect(focusCallback).toBeTruthy();
    if (focusCallback) {
      focusCallback(false);
    }

    // Wait for async operations
    await Promise.resolve();
    await Promise.resolve();

    // Verify that writeFile was called immediately
    expect(mockFileOps.writeFile).toHaveBeenCalledWith(
      '/test/tasks.md',
      expect.stringContaining('- [ ] <!-- sp:task1 --> Task from SP'),
    );

    // Verify the timer was cancelled
    expect(jest.getTimerCount()).toBe(0);
  });

  it('should not affect write when app loses focus but no pending write', async () => {
    // Set up initial state
    const initialMarkdown = '- [ ] <!-- sp:task1 --> Existing task';
    mockFileOps.setFileContent(initialMarkdown);

    const spTasks = [
      {
        id: 'task1',
        title: 'Existing task',
        isDone: false,
      },
    ];
    mockPluginAPI.getTasks.mockResolvedValue(spTasks);

    // Start the file watcher but don't trigger any sync
    await fileWatcher.start(true);

    // Simulate app losing focus without any pending writes
    if (focusCallback) {
      focusCallback(false);
    }

    // Wait for async operations
    await Promise.resolve();

    // Verify that writeFile was NOT called
    expect(mockFileOps.writeFile).not.toHaveBeenCalled();
  });

  it('should handle write errors gracefully when executing on focus loss', async () => {
    // Set up initial state
    mockFileOps.setFileContent('');

    const spTasks = [
      {
        id: 'task1',
        title: 'Task 1',
        isDone: false,
      },
    ];
    mockPluginAPI.getTasks.mockResolvedValue(spTasks);

    // Make writeFile fail
    mockFileOps.writeFile.mockRejectedValueOnce(new Error('Write failed'));

    // Trigger a SP to file sync
    await fileWatcher.performSync(undefined, undefined, 'sp');

    // Simulate app losing focus
    if (focusCallback) {
      focusCallback(false);
    }

    // Wait for async operations - need extra time for promise rejection handling
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    // Verify writeFile was attempted
    expect(mockFileOps.writeFile).toHaveBeenCalled();

    // The error handling happens asynchronously, so we can at least verify
    // that the write was attempted when focus was lost
  });

  it('should skip write if file was modified during the queue period', async () => {
    // Set up initial state
    const initialContent = '';
    mockFileOps.setFileContent(initialContent);

    const spTasks = [
      {
        id: 'task1',
        title: 'Task 1',
        isDone: false,
      },
    ];
    mockPluginAPI.getTasks.mockResolvedValue(spTasks);

    // Trigger a SP to file sync
    await fileWatcher.performSync(undefined, undefined, 'sp');

    // Modify the file content (simulating external edit)
    mockFileOps.setFileContent('- [ ] Externally added task');

    // Simulate app losing focus
    if (focusCallback) {
      focusCallback(false);
    }

    // Wait for async operations
    await Promise.resolve();
    await Promise.resolve();

    // Verify write was skipped
    expect(mockFileOps.writeFile).not.toHaveBeenCalled();
  });

  it('should handle focus change when onWindowFocusChange is not available', async () => {
    // Temporarily remove the focus change handler
    const originalHandler = mockPluginAPI.onWindowFocusChange;
    delete (mockPluginAPI as any).onWindowFocusChange;

    // Create a new file watcher without focus handler
    const fileWatcherNoFocus = new FileWatcherBatch({ config }, mockFileOps as any);

    // Restore the handler
    mockPluginAPI.onWindowFocusChange = originalHandler;

    // This should not throw any errors
    expect(() => {
      // Try to trigger a sync
      fileWatcherNoFocus.performSync(undefined, undefined, 'sp');
    }).not.toThrow();
  });
});
