import { MockFileOperations, PluginFileOperations } from '../file-operations';

describe('file-operations', () => {
  describe('MockFileOperations', () => {
    let mockFileOps: MockFileOperations;

    beforeEach(() => {
      mockFileOps = new MockFileOperations();
    });

    afterEach(() => {
      mockFileOps.clearAll();
    });

    it('should read and write files', async () => {
      const filePath = '/test/file.md';
      const content = 'Test content';

      await mockFileOps.writeFile(filePath, content);
      const readContent = await mockFileOps.readFile(filePath);

      expect(readContent).toBe(content);
    });

    it('should throw error when reading non-existent file', async () => {
      await expect(mockFileOps.readFile('/non-existent.md')).rejects.toThrow(
        'File not found',
      );
    });

    it('should allow setting file content directly', () => {
      const filePath = '/test/file.md';
      const content = 'Direct content';

      mockFileOps.setFileContent(filePath, content);

      expect(mockFileOps.getFileContent(filePath)).toBe(content);
    });

    it('should handle file watching', async () => {
      const filePath = '/test/file.md';
      const callback = jest.fn();

      const cleanup = await mockFileOps.watchFile(filePath, callback);

      // Trigger file change
      mockFileOps.triggerFileChange(filePath);
      expect(callback).toHaveBeenCalledTimes(1);

      // Trigger again
      mockFileOps.triggerFileChange(filePath);
      expect(callback).toHaveBeenCalledTimes(2);

      // Cleanup should remove the watcher
      await cleanup();
      mockFileOps.triggerFileChange(filePath);
      expect(callback).toHaveBeenCalledTimes(2); // No additional calls
    });

    it('should handle multiple watchers on different files', async () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      await mockFileOps.watchFile('/file1.md', callback1);
      await mockFileOps.watchFile('/file2.md', callback2);

      mockFileOps.triggerFileChange('/file1.md');
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).not.toHaveBeenCalled();

      mockFileOps.triggerFileChange('/file2.md');
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('should clear all files and watchers', async () => {
      mockFileOps.setFileContent('/file1.md', 'content1');
      mockFileOps.setFileContent('/file2.md', 'content2');

      const callback = jest.fn();
      await mockFileOps.watchFile('/file1.md', callback);

      mockFileOps.clearAll();

      expect(mockFileOps.getFileContent('/file1.md')).toBeUndefined();
      expect(mockFileOps.getFileContent('/file2.md')).toBeUndefined();

      // Watcher should be cleared too
      mockFileOps.triggerFileChange('/file1.md');
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('PluginFileOperations', () => {
    let mockPluginAPI: any;
    let pluginFileOps: PluginFileOperations;

    beforeEach(() => {
      jest.useFakeTimers();
      mockPluginAPI = {
        executeNodeScript: jest.fn(),
      };
      pluginFileOps = new PluginFileOperations(mockPluginAPI);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should read file successfully', async () => {
      const filePath = '/test/file.md';
      const content = 'File content';

      mockPluginAPI.executeNodeScript.mockResolvedValue({
        success: true,
        result: {
          success: true,
          content,
        },
      });

      const result = await pluginFileOps.readFile(filePath);

      expect(result).toBe(content);
      expect(mockPluginAPI.executeNodeScript).toHaveBeenCalledWith({
        script: expect.stringContaining('fs.readFileSync'),
        args: [filePath],
        timeout: 5000,
      });
    });

    it('should handle read file errors', async () => {
      mockPluginAPI.executeNodeScript.mockResolvedValue({
        success: true,
        result: {
          success: false,
          error: 'File not found',
        },
      });

      await expect(pluginFileOps.readFile('/non-existent.md')).rejects.toThrow(
        'File not found',
      );
    });

    it('should write file successfully', async () => {
      const filePath = '/test/file.md';
      const content = 'New content';

      mockPluginAPI.executeNodeScript.mockResolvedValue({
        success: true,
        result: {
          success: true,
        },
      });

      await pluginFileOps.writeFile(filePath, content);

      expect(mockPluginAPI.executeNodeScript).toHaveBeenCalledWith({
        script: expect.stringContaining('fs.writeFileSync'),
        args: [filePath, content],
        timeout: 5000,
      });
    });

    it('should handle write file errors', async () => {
      mockPluginAPI.executeNodeScript.mockResolvedValue({
        success: true,
        result: {
          success: false,
          error: 'Permission denied',
        },
      });

      await expect(pluginFileOps.writeFile('/readonly.md', 'content')).rejects.toThrow(
        'Permission denied',
      );
    });

    it('should set up file watching', async () => {
      const filePath = '/test/file.md';
      const callback = jest.fn();

      let mtime = Date.now();
      mockPluginAPI.executeNodeScript.mockResolvedValue({
        success: true,
        result: {
          success: true,
          mtime: mtime,
        },
      });

      const cleanup = await pluginFileOps.watchFile(filePath, callback);

      // watchFile sets up an interval, not an immediate call
      expect(typeof cleanup).toBe('function');

      // Fast-forward time to trigger the interval
      jest.advanceTimersByTime(2100);
      await Promise.resolve(); // Let any promises resolve

      // Now it should have been called
      expect(mockPluginAPI.executeNodeScript).toHaveBeenCalled();

      // Simulate file change by increasing mtime
      mtime = Date.now() + 1000;
      mockPluginAPI.executeNodeScript.mockResolvedValue({
        success: true,
        result: {
          success: true,
          mtime: mtime,
        },
      });

      // Trigger another interval check
      jest.advanceTimersByTime(2100);
      await Promise.resolve();

      // Callback should have been called due to mtime change
      expect(callback).toHaveBeenCalled();

      // Cleanup
      await cleanup();
    });

    it('should handle plugin API failures', async () => {
      mockPluginAPI.executeNodeScript.mockResolvedValue({
        success: false,
        error: 'Plugin API error',
      });

      await expect(pluginFileOps.readFile('/test.md')).rejects.toThrow(
        'Plugin API error',
      );
      await expect(pluginFileOps.writeFile('/test.md', 'content')).rejects.toThrow(
        'Plugin API error',
      );
      // watchFile doesn't throw, it returns a cleanup function
      const cleanup = await pluginFileOps.watchFile('/test.md', jest.fn());
      expect(typeof cleanup).toBe('function');
    });
  });
});
