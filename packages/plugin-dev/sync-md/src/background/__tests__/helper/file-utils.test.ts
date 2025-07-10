import {
  readTasksFile,
  writeTasksFile,
  getFileStats,
  ensureDirectoryExists,
} from '../../helper/file-utils';

// Mock the global PluginAPI
const mockExecuteNodeScript = jest.fn();
(global as any).PluginAPI = {
  executeNodeScript: mockExecuteNodeScript,
};

describe('file-utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('readTasksFile', () => {
    it('should read tasks.md file', async () => {
      mockExecuteNodeScript.mockResolvedValue({
        success: true,
        result: { success: true, content: '# Tasks content' },
      });

      const content = await readTasksFile('/test/dir');

      expect(mockExecuteNodeScript).toHaveBeenCalledWith({
        script: expect.stringContaining('fs.readFileSync'),
        args: ['/test/dir'],
        timeout: 5000,
      });
      expect(content).toBe('# Tasks content');
    });

    it('should return null if file does not exist', async () => {
      mockExecuteNodeScript.mockResolvedValue({
        success: true,
        result: { success: true, content: null },
      });

      const content = await readTasksFile('/test/dir');

      expect(content).toBeNull();
    });

    it('should throw other errors', async () => {
      mockExecuteNodeScript.mockResolvedValue({
        success: true,
        result: { success: false, error: 'Permission denied' },
      });

      await expect(readTasksFile('/test/dir')).rejects.toThrow('Permission denied');
    });
  });

  describe('writeTasksFile', () => {
    it('should write content to tasks.md', async () => {
      mockExecuteNodeScript.mockResolvedValue({
        success: true,
        result: { success: true },
      });

      await writeTasksFile('/test/dir', '# New content');

      expect(mockExecuteNodeScript).toHaveBeenCalledWith({
        script: expect.stringContaining('fs.writeFileSync'),
        args: ['/test/dir', '# New content'],
        timeout: 5000,
      });
    });
  });

  describe('getFileStats', () => {
    it('should return file modification time', async () => {
      const mtime = new Date('2024-01-01');
      mockExecuteNodeScript.mockResolvedValue({
        success: true,
        result: { success: true, mtime: mtime.toISOString() },
      });

      const stats = await getFileStats('/test/dir');

      expect(stats).toEqual({ mtime });
    });

    it('should return null if file does not exist', async () => {
      mockExecuteNodeScript.mockResolvedValue({
        success: true,
        result: { success: true, mtime: null },
      });

      const stats = await getFileStats('/test/dir');

      expect(stats).toBeNull();
    });
  });

  describe('ensureDirectoryExists', () => {
    it('should create directory with recursive option', async () => {
      mockExecuteNodeScript.mockResolvedValue({
        success: true,
        result: { success: true },
      });

      await ensureDirectoryExists('/test/dir/nested');

      expect(mockExecuteNodeScript).toHaveBeenCalledWith({
        script: expect.stringContaining('fs.mkdirSync'),
        args: ['/test/dir/nested'],
        timeout: 5000,
      });
    });
  });
});
