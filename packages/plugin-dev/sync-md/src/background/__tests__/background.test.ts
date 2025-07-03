import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { PluginAPI } from '../shared/plugin-api';

// Mock FileWatcherBatch
jest.mock('../file-watcher', () => ({
  FileWatcherBatch: jest
    .fn()
    .mockImplementation((options: { config: any; onSync: any; onError: any }) => ({
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn(),
      performSync: jest.fn().mockResolvedValue({ success: true }),
      getSyncInfo: jest.fn().mockResolvedValue({
        lastSyncTime: Date.now(),
        taskCount: 5,
        isWatching: true,
      }),
      _config: options.config,
      _onSync: options.onSync,
      _onError: options.onError,
    })),
}));

describe('Background Script', () => {
  let mockPluginAPI: Partial<PluginAPI>;
  let messageHandler: (message: unknown) => unknown;
  let registeredHooks: Record<string, (data?: unknown) => void> = {};

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();
    registeredHooks = {};

    // Setup mock PluginAPI
    mockPluginAPI = {
      onMessage: jest.fn((handler) => {
        messageHandler = handler;
        return true;
      }),
      loadSyncedData: jest.fn().mockResolvedValue(null),
      executeNodeScript: jest.fn().mockResolvedValue({
        success: true,
        result: { success: true, content: 'file content' },
      }),
      registerHook: jest.fn((hookName, callback) => {
        registeredHooks[hookName] = callback;
      }),
      persistDataSynced: jest.fn().mockResolvedValue(undefined),
      getTasks: jest.fn().mockResolvedValue([]),
      getAllProjects: jest.fn().mockResolvedValue([]),
    };

    // Mock window.PluginAPI
    (global as any).window = {
      PluginAPI: mockPluginAPI,
      addEventListener: jest.fn(),
      setTimeout: global.setTimeout,
      clearTimeout: global.clearTimeout,
      parent: {
        postMessage: jest.fn(),
      },
    };
    (global as any).PluginAPI = mockPluginAPI;

    // Import and initialize the plugin
    const { initPlugin } = await import('../background');
    await initPlugin();
  });

  afterEach(() => {
    delete (global as any).window;
  });

  describe('Message Handling', () => {
    it('should handle configUpdated message', async () => {
      const config = {
        enabled: true,
        filePath: '/test/file.md',
        projectId: 'proj1',
        syncDirection: 'bidirectional' as const,
      };

      const response = await messageHandler({
        type: 'configUpdated',
        config,
      });

      expect((response as any).success).toBe(true);

      // Verify FileWatcher was created
      const { FileWatcherBatch } = require('../file-watcher');
      expect(FileWatcherBatch).toHaveBeenCalledWith(
        expect.objectContaining({
          config,
          onSync: expect.any(Function),
          onError: expect.any(Function),
        }),
      );
    });

    it('should stop existing watcher when config is disabled', async () => {
      // First enable
      await messageHandler({
        type: 'configUpdated',
        config: { enabled: true, filePath: '/test/file.md' },
      });

      const { FileWatcherBatch } = require('../file-watcher');
      const mockInstance = FileWatcherBatch.mock.results[0].value;

      // Then disable
      await messageHandler({
        type: 'configUpdated',
        config: { enabled: false },
      });

      expect(mockInstance.stop).toHaveBeenCalled();
    });

    it('should handle testFile message', async () => {
      const response = await messageHandler({
        type: 'testFile',
        filePath: '/test/file.md',
      });

      expect((response as any).success).toBe(true);
      expect((response as any).preview).toBeDefined();
      expect(mockPluginAPI.executeNodeScript).toHaveBeenCalledWith(
        expect.objectContaining({
          script: expect.stringContaining('fs.readFileSync'),
          args: ['/test/file.md'],
          timeout: 5000,
        }),
      );
    });

    it('should handle testFile error gracefully', async () => {
      mockPluginAPI.executeNodeScript = jest.fn().mockResolvedValue({
        success: false,
        error: 'File not found',
      });

      const response = await messageHandler({
        type: 'testFile',
        filePath: '/nonexistent/file.md',
      });

      expect((response as any).success).toBe(false);
      expect((response as any).error).toBe('File not found');
    });

    it('should handle syncNow message', async () => {
      // Setup watcher first
      await messageHandler({
        type: 'configUpdated',
        config: { enabled: true },
      });

      jest.useFakeTimers();
      const response = await messageHandler({ type: 'syncNow' });

      expect((response as any).success).toBe(true);

      // The sync will be triggered which calls getTasks and getAllProjects
      // Fast-forward timers to trigger debounced sync
      jest.advanceTimersByTime(3000);
      await Promise.resolve(); // Let promises resolve

      expect(mockPluginAPI.getTasks).toHaveBeenCalled();
      expect(mockPluginAPI.getAllProjects).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should handle syncNow when no watcher exists', async () => {
      // Clear the fileWatcher that was set up in previous test
      const { FileWatcherBatch } = require('../file-watcher');
      FileWatcherBatch.mockClear();

      // Re-initialize the background script without a config
      jest.resetModules();
      const { initPlugin } = await import('../background');
      await initPlugin();

      const response = await messageHandler({ type: 'syncNow' });

      expect((response as any).success).toBe(false);
      expect((response as any).error).toBe('File watcher not initialized');
    });

    it('should handle getSyncInfo message', async () => {
      // Setup watcher first
      await messageHandler({
        type: 'configUpdated',
        config: { enabled: true },
      });

      const response = await messageHandler({ type: 'getSyncInfo' });

      expect((response as any).success).toBe(true);
      expect((response as any).lastSyncTime).toBeDefined();
      expect((response as any).taskCount).toBe(5);
      expect((response as any).isWatching).toBe(true);
    });

    it('should handle checkDesktopMode message', async () => {
      const response = await messageHandler({ type: 'checkDesktopMode' });

      expect((response as any).success).toBe(true);
      expect((response as any).isDesktop).toBe(true);
    });

    it('should handle unknown message type', async () => {
      const response = await messageHandler({ type: 'unknownType' });

      expect((response as any).success).toBe(false);
      expect((response as any).error).toContain('Unknown message type');
    });

    it('should handle invalid message format', async () => {
      const response1 = (await messageHandler(null)) as any;
      expect(response1.success).toBe(false);
      expect(response1.error).toContain('Invalid message format');

      const response2 = (await messageHandler('string message')) as any;
      expect(response2.success).toBe(false);
      expect(response2.error).toContain('Invalid message format');

      const response3 = (await messageHandler({ noType: true })) as any;
      expect(response3.success).toBe(false);
      expect(response3.error).toContain('Invalid message format');
    });

    it('should handle message handler errors', async () => {
      mockPluginAPI.executeNodeScript = jest
        .fn()
        .mockRejectedValue(new Error('Unexpected error'));

      const response = await messageHandler({
        type: 'testFile',
        filePath: '/test/file.md',
      });

      expect((response as any).success).toBe(false);
      expect((response as any).error).toBe('Unexpected error');
    });
  });

  describe('Hook Registration', () => {
    it('should register anyTaskUpdate hook', async () => {
      expect(mockPluginAPI.registerHook).toHaveBeenCalledWith(
        'anyTaskUpdate',
        expect.any(Function),
      );
    });

    it('should handle anyTaskUpdate hook calls', async () => {
      // We need to simulate a sync being triggered via the hook
      // First, let's get the actual hook function that was registered
      const hookCall = (mockPluginAPI.registerHook as jest.Mock).mock.calls.find(
        (call) => call[0] === 'anyTaskUpdate',
      );
      expect(hookCall).toBeDefined();

      const hookFunction = hookCall[1];

      // Now trigger the hook with various action types
      jest.useFakeTimers();

      // Call the hook function
      hookFunction({ action: 'update' });

      // Fast-forward timers to trigger debounced sync
      jest.advanceTimersByTime(3000);

      // The hook should trigger a sync request which will eventually call getTasks and getAllProjects
      await Promise.resolve(); // Let promises resolve

      expect(mockPluginAPI.getTasks).toHaveBeenCalled();
      expect(mockPluginAPI.getAllProjects).toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('Auto-start on Load', () => {
    it('should load saved config on startup', async () => {
      const savedConfig = JSON.stringify({
        enabled: true,
        filePath: '/saved/file.md',
        projectId: 'saved-proj',
      });

      mockPluginAPI.loadSyncedData = jest.fn().mockResolvedValue(savedConfig);

      // Re-import to trigger initialization with saved data
      jest.isolateModules(() => {
        require('../background');
      });

      // Wait for async initialization
      await new Promise((resolve) => setTimeout(resolve, 100));

      const { FileWatcherBatch } = require('../file-watcher');
      expect(FileWatcherBatch).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            enabled: true,
            filePath: '/saved/file.md',
            projectId: 'saved-proj',
          }),
        }),
      );
    });

    it('should handle invalid saved config gracefully', async () => {
      mockPluginAPI.loadSyncedData = jest.fn().mockResolvedValue('invalid json');

      // Re-import to trigger initialization
      jest.isolateModules(() => {
        require('../background');
      });

      // Wait for async initialization
      await new Promise((resolve) => setTimeout(resolve, 100));

      const { FileWatcherBatch } = require('../file-watcher');
      // Should not create watcher with invalid config
      expect(FileWatcherBatch).not.toHaveBeenCalled();
    });
  });

  describe('FileWatcher Callbacks', () => {
    it('should handle sync and error callbacks', async () => {
      await messageHandler({
        type: 'configUpdated',
        config: { enabled: true },
      });

      const { FileWatcherBatch } = require('../file-watcher');
      const createCall = FileWatcherBatch.mock.calls[0][0];

      // Test that callbacks are set up correctly
      expect(createCall.onSync).toBeDefined();
      expect(createCall.onError).toBeDefined();
      expect(typeof createCall.onSync).toBe('function');
      expect(typeof createCall.onError).toBe('function');
    });
  });

  describe('Message Handler Registration', () => {
    it('should register message handler when PluginAPI is available', async () => {
      // The plugin is already initialized in beforeEach
      // Just check that the message handler was registered
      expect(mockPluginAPI.onMessage).toHaveBeenCalled();
    });

    it('should handle missing executeNodeScript in testFile', async () => {
      // Remove executeNodeScript
      delete mockPluginAPI.executeNodeScript;

      const response = await messageHandler({
        type: 'testFile',
        filePath: '/test/file.md',
      });

      expect((response as any).success).toBe(false);
      expect((response as any).error).toContain('Node script execution not available');
    });

    it('should handle missing filePath in testFile message', async () => {
      const response = await messageHandler({
        type: 'testFile',
      });

      expect((response as any).success).toBe(false);
      expect((response as any).error).toContain('No file path provided');
    });
  });
});
