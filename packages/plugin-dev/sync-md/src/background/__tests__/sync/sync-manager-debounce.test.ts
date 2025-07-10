import { initSyncManager } from '../../sync/sync-manager';
import { LocalUserCfg } from '../../local-config';
import * as fileWatcher from '../../sync/file-watcher';
import { SYNC_DEBOUNCE_MS_MD_TO_SP } from '../../config.const';
import { PluginHooks } from '@super-productivity/plugin-api';

// Mock dependencies
jest.mock('../../sync/file-watcher');
jest.mock('../../sync/sp-to-md', () => ({
  spToMd: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../sync/md-to-sp', () => ({
  mdToSp: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../helper/file-utils', () => ({
  getFileStats: jest.fn().mockResolvedValue(null), // Return null to skip initial sync
  readTasksFile: jest.fn().mockResolvedValue('- [ ] Test task'),
}));
jest.mock('../../sync/verify-sync', () => ({
  verifySyncState: jest.fn().mockResolvedValue({ isInSync: true, differences: [] }),
  logSyncVerification: jest.fn(),
}));

// Mock PluginAPI
global.PluginAPI = {
  registerHook: jest.fn(),
  onWindowFocusChange: jest.fn(),
} as any;

// Import the mocked modules
const { spToMd } = jest.requireMock('../../sync/sp-to-md');
const { mdToSp } = jest.requireMock('../../sync/md-to-sp');

describe('Sync Manager Debounce Behavior', () => {
  const mockConfig: LocalUserCfg = {
    filePath: '/test/tasks.md',
    projectId: 'test-project',
    enabled: true,
  };

  let mockFileChangeCallback: Function;
  let mockWindowFocusCallback: Function;

  // Helper to flush promises - using process.nextTick which works with fake timers
  const flushPromises = () => new Promise((resolve) => process.nextTick(resolve));

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Capture the file watcher callback
    (fileWatcher.startFileWatcher as jest.Mock).mockImplementation((path, callback) => {
      mockFileChangeCallback = callback;
    });

    // Capture the window focus callback
    (global.PluginAPI.onWindowFocusChange as jest.Mock).mockImplementation((callback) => {
      mockWindowFocusCallback = callback;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('MD to SP sync debouncing', () => {
    it('should debounce MD to SP sync for 10 seconds', async () => {
      initSyncManager(mockConfig);

      // Trigger file change
      mockFileChangeCallback();

      // Verify sync hasn't been called yet
      expect(mdToSp).not.toHaveBeenCalled();

      // Fast forward 5 seconds
      jest.advanceTimersByTime(5000);
      expect(mdToSp).not.toHaveBeenCalled();

      // Fast forward to 10 seconds total
      jest.advanceTimersByTime(5000);

      // Wait for any pending promises
      await flushPromises();

      // Now sync should be called
      expect(mdToSp).toHaveBeenCalledTimes(1);
    });

    it('should reset debounce timer on multiple file changes', async () => {
      initSyncManager(mockConfig);

      // First file change
      mockFileChangeCallback();

      // Fast forward 5 seconds
      jest.advanceTimersByTime(5000);

      // Second file change - should reset timer
      mockFileChangeCallback();

      // Fast forward 5 more seconds (total 10 from first change)
      jest.advanceTimersByTime(5000);

      // Sync should not have been called yet
      expect(mdToSp).not.toHaveBeenCalled();

      // Fast forward 5 more seconds (10 seconds from second change)
      jest.advanceTimersByTime(5000);

      // Wait for any pending promises
      await flushPromises();

      // Now sync should be called
      expect(mdToSp).toHaveBeenCalledTimes(1);
    });

    it('should trigger sync immediately when window gains focus with pending sync', async () => {
      initSyncManager(mockConfig);

      // Window starts focused
      mockWindowFocusCallback(true);

      // Trigger file change
      mockFileChangeCallback();

      // Window loses focus
      mockWindowFocusCallback(false);

      // Fast forward 5 seconds (half of debounce time)
      jest.advanceTimersByTime(5000);
      expect(mdToSp).not.toHaveBeenCalled();

      // Window gains focus - should trigger immediate sync
      mockWindowFocusCallback(true);

      // Wait for any pending promises
      await flushPromises();

      // Sync should be called immediately
      expect(mdToSp).toHaveBeenCalledTimes(1);
    });

    it('should not trigger immediate sync when window gains focus without pending sync', async () => {
      initSyncManager(mockConfig);

      // Window starts focused
      mockWindowFocusCallback(true);

      // Window loses focus (no file change)
      mockWindowFocusCallback(false);

      // Window gains focus again
      mockWindowFocusCallback(true);

      // Allow async operations to complete
      await Promise.resolve();

      // No sync should be triggered
      expect(mdToSp).not.toHaveBeenCalled();
    });

    it('should not trigger immediate sync if sync already completed', async () => {
      initSyncManager(mockConfig);

      // Trigger file change
      mockFileChangeCallback();

      // Fast forward to complete the sync
      jest.advanceTimersByTime(SYNC_DEBOUNCE_MS_MD_TO_SP);
      await flushPromises();

      expect(mdToSp).toHaveBeenCalledTimes(1);

      // Window loses focus then gains focus
      mockWindowFocusCallback(false);
      mockWindowFocusCallback(true);

      await Promise.resolve();

      // Should still only have one sync call
      expect(mdToSp).toHaveBeenCalledTimes(1);
    });
  });

  describe('SP to MD sync behavior', () => {
    it('should use short debounce for SP to MD sync', async () => {
      initSyncManager(mockConfig);

      // Trigger SP change through hook
      const spChangeHandler = (
        global.PluginAPI.registerHook as jest.Mock
      ).mock.calls.find((call) => call[0] === PluginHooks.ANY_TASK_UPDATE)?.[1];

      expect(spChangeHandler).toBeDefined();
      spChangeHandler();

      // Fast forward 500ms (SYNC_DEBOUNCE_MS)
      jest.advanceTimersByTime(500);

      await flushPromises();

      // SP to MD sync should be called
      expect(spToMd).toHaveBeenCalledTimes(1);
    });
  });
});
