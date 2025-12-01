import { startFileWatcher, stopFileWatcher } from '../../sync/file-watcher';

// Set up Node.js environment for tests
if (typeof setImmediate === 'undefined') {
  (global as any).setImmediate = (fn: () => void) => setTimeout(fn, 0);
}

// Mock PluginAPI globally
(global as any).PluginAPI = {
  executeNodeScript: jest.fn(),
};

describe('File Watcher', () => {
  const mockFilePath = '/test/tasks.md';
  const mockCallback = jest.fn();
  let mockExecuteNodeScript: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Setup mock for PluginAPI.executeNodeScript
    mockExecuteNodeScript = jest.fn();
    (global as any).PluginAPI = {
      executeNodeScript: mockExecuteNodeScript,
    };

    // Default mock implementation returns a file with mtime
    mockExecuteNodeScript.mockResolvedValue({
      success: true,
      result: {
        success: true,
        mtime: new Date('2024-01-01T00:00:00Z').toISOString(),
      },
    });
  });

  afterEach(() => {
    stopFileWatcher();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('startFileWatcher', () => {
    it('should start watching a file when it exists', async () => {
      startFileWatcher(mockFilePath, mockCallback);

      // Should immediately check file mtime
      await Promise.resolve(); // Let promises resolve
      expect(mockExecuteNodeScript).toHaveBeenCalledWith({
        script: expect.stringContaining('fs.statSync'),
        args: [mockFilePath],
        timeout: 5000,
      });

      // Should set up interval for polling
      expect(jest.getTimerCount()).toBe(1);
    });

    it('should handle when executeNodeScript is not available', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      (global as any).PluginAPI = {}; // No executeNodeScript

      startFileWatcher(mockFilePath, mockCallback);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'File watching is only available in the desktop version',
      );
      expect(jest.getTimerCount()).toBe(0);

      consoleWarnSpy.mockRestore();
    });

    it('should stop existing watcher before starting new one', () => {
      // Start first watcher
      startFileWatcher(mockFilePath, mockCallback);
      expect(jest.getTimerCount()).toBe(1);

      // Start second watcher
      startFileWatcher(mockFilePath, mockCallback);

      // Should still only have one timer
      expect(jest.getTimerCount()).toBe(1);
    });

    it('should trigger callback on file change event', async () => {
      const initialMtime = new Date('2024-01-01T00:00:00Z');
      const changedMtime = new Date('2024-01-01T00:00:01Z');

      // Mock initial check
      mockExecuteNodeScript.mockResolvedValueOnce({
        success: true,
        result: { success: true, mtime: initialMtime.toISOString() },
      });

      startFileWatcher(mockFilePath, mockCallback);

      // Let initial mtime check complete - flush promise queue and timers
      await jest.advanceTimersToNextTimerAsync();

      // Now mock the changed mtime for the next poll
      mockExecuteNodeScript.mockResolvedValueOnce({
        success: true,
        result: { success: true, mtime: changedMtime.toISOString() },
      });

      // Advance timer to trigger poll and wait for async completion
      await jest.advanceTimersByTimeAsync(2000);

      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('should not trigger callback when mtime is unchanged', async () => {
      const sameMtime = new Date('2024-01-01T00:00:00Z');

      mockExecuteNodeScript.mockResolvedValue({
        success: true,
        result: { success: true, mtime: sameMtime.toISOString() },
      });

      startFileWatcher(mockFilePath, mockCallback);

      // Let initial mtime check complete
      await Promise.resolve();

      // Advance timer to trigger multiple polls
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
      jest.advanceTimersByTime(1000);
      await Promise.resolve();

      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should handle file deletion gracefully', async () => {
      mockExecuteNodeScript
        .mockResolvedValueOnce({
          success: true,
          result: {
            success: true,
            mtime: new Date('2024-01-01T00:00:00Z').toISOString(),
          },
        })
        .mockResolvedValueOnce({
          success: true,
          result: { success: true, mtime: null }, // File deleted
        })
        .mockResolvedValueOnce({
          success: true,
          result: {
            success: true,
            mtime: new Date('2024-01-01T00:00:02Z').toISOString(),
          }, // File recreated
        });

      startFileWatcher(mockFilePath, mockCallback);

      // Let initial mtime check complete
      await Promise.resolve();

      // File deleted - no callback
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
      expect(mockCallback).not.toHaveBeenCalled();

      // File recreated - no callback (new file, no change from null)
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should handle executeNodeScript errors gracefully', async () => {
      mockExecuteNodeScript
        .mockResolvedValueOnce({
          success: true,
          result: {
            success: true,
            mtime: new Date('2024-01-01T00:00:00Z').toISOString(),
          },
        })
        .mockRejectedValueOnce(new Error('Script execution failed'));

      startFileWatcher(mockFilePath, mockCallback);

      // Let initial mtime check complete
      await Promise.resolve();

      // Advance timer to trigger poll that will fail
      jest.advanceTimersByTime(1000);
      await Promise.resolve();

      // Should not crash, callback should not be called
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('stopFileWatcher', () => {
    it('should stop the watcher if it exists', () => {
      startFileWatcher(mockFilePath, mockCallback);
      expect(jest.getTimerCount()).toBe(1);

      stopFileWatcher();

      expect(jest.getTimerCount()).toBe(0);
    });

    it('should handle multiple stop calls gracefully', () => {
      startFileWatcher(mockFilePath, mockCallback);

      stopFileWatcher();
      stopFileWatcher(); // Second call should not throw

      expect(jest.getTimerCount()).toBe(0);
    });

    it('should handle stop without start', () => {
      // Should not throw
      expect(() => stopFileWatcher()).not.toThrow();
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle rapid file changes without excessive callbacks', async () => {
      const mtime1 = new Date('2024-01-01T00:00:00Z');
      const mtime2 = new Date('2024-01-01T00:00:01Z');
      const mtime3 = new Date('2024-01-01T00:00:02Z');

      // Mock initial check
      mockExecuteNodeScript.mockResolvedValueOnce({
        success: true,
        result: { success: true, mtime: mtime1.toISOString() },
      });

      startFileWatcher(mockFilePath, mockCallback);

      // Let initial check complete - flush promise queue and timers
      await jest.advanceTimersToNextTimerAsync();

      // First poll with change
      mockExecuteNodeScript.mockResolvedValueOnce({
        success: true,
        result: { success: true, mtime: mtime2.toISOString() },
      });
      await jest.advanceTimersByTimeAsync(2000);

      // Second poll with another change
      mockExecuteNodeScript.mockResolvedValueOnce({
        success: true,
        result: { success: true, mtime: mtime3.toISOString() },
      });
      await jest.advanceTimersByTimeAsync(2000);

      // Each change triggers one callback
      expect(mockCallback).toHaveBeenCalledTimes(2);
    });

    it('should handle file path with spaces', async () => {
      const pathWithSpaces = '/test/my tasks/tasks.md';

      startFileWatcher(pathWithSpaces, mockCallback);
      await Promise.resolve();

      expect(mockExecuteNodeScript).toHaveBeenCalledWith({
        script: expect.stringContaining('fs.statSync'),
        args: [pathWithSpaces],
        timeout: 5000,
      });
    });

    it('should handle deeply nested file paths', async () => {
      const deepPath = '/very/deeply/nested/folder/structure/tasks.md';

      startFileWatcher(deepPath, mockCallback);
      await Promise.resolve();

      expect(mockExecuteNodeScript).toHaveBeenCalledWith({
        script: expect.stringContaining('fs.statSync'),
        args: [deepPath],
        timeout: 5000,
      });
    });
  });
});
