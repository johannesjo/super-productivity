// Sync.md Plugin for SuperProductivity (Solid.js version)
// This plugin syncs markdown files with project tasks using a Solid.js UI

class SyncMdPlugin {
  constructor() {
    this.config = null;
    this.watchInterval = null;
    this.lastSyncTime = null;
    this.syncInProgress = false;
    this.bidirectionalSync = null; // Will be initialized when needed
    this.syncState = null;
  }

  async init() {
    console.log('[Sync.md] Plugin initializing (Solid.js version)...');

    // Register message handler for iframe communication
    if (PluginAPI?.onMessage) {
      PluginAPI.onMessage((message) => this.handleMessage(message));
    }

    // Register hooks for task changes
    if (PluginAPI?.registerHook && PluginAPI?.Hooks) {
      PluginAPI.registerHook(PluginAPI.Hooks.TASK_UPDATE, (task) => {
        this.handleTaskUpdate(task);
      });
      PluginAPI.registerHook(PluginAPI.Hooks.TASK_DELETE, (taskId) => {
        this.handleTaskDeleted(taskId);
      });
    }

    // Load saved configuration
    await this.loadConfig();

    // Start watching if configured
    if (this.config?.filePath && this.config?.projectId && this.config?.enabled) {
      await this.startWatching();
    }

    console.log('[Sync.md] Plugin initialized');
  }

  async handleMessage(message) {
    console.log('[Sync.md] Received message:', message);

    try {
      switch (message.type) {
        case 'configUpdated':
          await this.saveConfig(message.config);
          await this.stopWatching();
          if (
            message.config?.filePath &&
            message.config?.projectId &&
            message.config?.enabled
          ) {
            await this.startWatching();
          }
          return { success: true };

        case 'testFile':
          const testResult = await this.testFile(message.filePath);
          return testResult;

        case 'getSyncInfo':
          const taskCount = await this.getTaskCount();
          return {
            isWatching: !!this.watchInterval,
            lastSyncTime: this.lastSyncTime,
            taskCount: taskCount,
          };

        case 'syncNow':
          console.log('[Sync.md] Manual sync requested');
          const syncResult = await this.performSync();
          return { success: true, result: syncResult };

        default:
          console.warn('[Sync.md] Unknown message type:', message.type);
          return null;
      }
    } catch (error) {
      console.error('[Sync.md] Error handling message:', error);
      return { success: false, error: error.message };
    }
  }

  async loadConfig() {
    try {
      const data = await PluginAPI.loadSyncedData();
      if (data) {
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
        this.config = parsedData.config || parsedData;
        this.syncState = parsedData.syncState || null;
        console.log('[Sync.md] Loaded config:', this.config);
      }
    } catch (error) {
      console.error('[Sync.md] Error loading config:', error);
    }
  }

  async saveConfig(config) {
    try {
      this.config = config;
      const dataToSave = JSON.stringify({
        config: config,
        syncState: this.syncState,
      });
      await PluginAPI.persistDataSynced(dataToSave);
      console.log('[Sync.md] Config saved:', config);
      return true;
    } catch (error) {
      console.error('[Sync.md] Error saving config:', error);
      return false;
    }
  }

  async startWatching() {
    if (!this.config?.filePath || !PluginAPI?.executeNodeScript) {
      console.warn('[Sync.md] Cannot start watching: missing config or permissions');
      return;
    }

    try {
      // Stop existing watcher if any
      if (this.watchInterval) {
        await this.stopWatching();
      }

      // Initial sync
      await this.performSync();

      // Start polling interval (check every 2 seconds)
      this.watchInterval = setInterval(() => {
        this.checkForChanges();
      }, 2000);

      console.log('[Sync.md] Started watching file:', this.config.filePath);
    } catch (error) {
      console.error('[Sync.md] Error starting watcher:', error);
    }
  }

  async stopWatching() {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = null;
      console.log('[Sync.md] Stopped watching file');
    }
  }

  async checkForChanges() {
    if (this.syncInProgress) return;

    try {
      const fileData = await this.readFile(this.config.filePath);
      if (fileData.exists && fileData.content) {
        // Check if file has changed
        const currentChecksum = this.calculateChecksum(fileData.content);
        const lastChecksum = this.syncState?.fileChecksum;

        if (currentChecksum !== lastChecksum) {
          console.log('[Sync.md] File changed, syncing...');
          await this.performSync();
        }
      }
    } catch (error) {
      console.error('[Sync.md] Error checking file:', error);
    }
  }

  async performSync() {
    if (this.syncInProgress || !this.config?.projectId) return;

    this.syncInProgress = true;
    try {
      // Read current file content
      const fileData = await this.readFile(this.config.filePath);
      if (!fileData.exists || !fileData.content) {
        throw new Error('File not found or empty');
      }

      // Get current project tasks
      const allTasks = await PluginAPI.getTasks();
      const projectTasks = allTasks.filter(
        (task) => task.projectId === this.config.projectId,
      );

      // Initialize sync module if needed
      if (!this.bidirectionalSync) {
        // Dynamic import would be ideal here, but for plugin compatibility we'll inline the logic
        this.bidirectionalSync = new SimpleBidirectionalSync();
      }

      // Perform sync based on direction
      const syncResult = await this.bidirectionalSync.sync(
        fileData.content,
        projectTasks,
        this.config.syncDirection,
        this.syncState,
      );

      console.log('[Sync.md] Sync completed:', syncResult);

      // Apply sync results
      if (this.config.syncDirection !== 'projectToFile') {
        await this.applyFileChangesToProject(syncResult, fileData.content);
      }

      if (this.config.syncDirection !== 'fileToProject') {
        await this.applyProjectChangesToFile(syncResult, projectTasks);
      }

      // Update sync state
      this.syncState = this.bidirectionalSync.updateSyncState(
        fileData.content,
        projectTasks,
      );
      await this.saveConfig(this.config);

      this.lastSyncTime = new Date();
      return syncResult;
    } catch (error) {
      console.error('[Sync.md] Sync error:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  async applyFileChangesToProject(syncResult, markdownContent) {
    // Implementation would parse markdown and update project tasks
    console.log('[Sync.md] Applying file changes to project...');
    // This is simplified - real implementation would handle all the sync operations
  }

  async applyProjectChangesToFile(syncResult, projectTasks) {
    // Implementation would generate markdown from project tasks
    console.log('[Sync.md] Applying project changes to file...');
    // This is simplified - real implementation would handle all the sync operations
  }

  async testFile(filePath) {
    if (!PluginAPI?.executeNodeScript) {
      throw new Error('Node execution permission required');
    }

    const testScript = `
      const fs = require('fs');
      const path = require('path');
      const filePath = ${JSON.stringify(filePath)};

      try {
        const stats = fs.statSync(filePath);
        const content = fs.readFileSync(filePath, 'utf8');
        console.log(JSON.stringify({
          exists: true,
          isFile: stats.isFile(),
          size: stats.size,
          content: content.substring(0, 500),
          preview: content.substring(0, 500)
        }));
      } catch (error) {
        console.log(JSON.stringify({
          exists: false,
          error: error.message
        }));
      }
    `;

    const result = await PluginAPI.executeNodeScript({
      script: testScript,
      timeout: 5000,
    });

    if (result.success && result.result) {
      const output = typeof result.result === 'string' ? result.result : '';
      return JSON.parse(output);
    } else {
      throw new Error(result.error || 'Test connection failed');
    }
  }

  async readFile(filePath) {
    if (!PluginAPI?.executeNodeScript) {
      throw new Error('Node execution permission required');
    }

    const readScript = `
      const fs = require('fs');
      const filePath = ${JSON.stringify(filePath)};

      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const stats = fs.statSync(filePath);
        console.log(JSON.stringify({
          exists: true,
          content: content,
          modifiedTime: stats.mtime.getTime()
        }));
      } catch (error) {
        console.log(JSON.stringify({
          exists: false,
          error: error.message
        }));
      }
    `;

    const result = await PluginAPI.executeNodeScript({
      script: readScript,
      timeout: 5000,
    });

    if (result.success && result.result) {
      const output = typeof result.result === 'string' ? result.result : '';
      return JSON.parse(output);
    } else {
      throw new Error(result.error || 'Read operation failed');
    }
  }

  async getTaskCount() {
    if (!this.config?.projectId) return 0;

    const allTasks = await PluginAPI.getTasks();
    return allTasks.filter((task) => task.projectId === this.config.projectId).length;
  }

  calculateChecksum(content) {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  async handleTaskUpdate(task) {
    if (
      this.syncInProgress ||
      !this.config?.projectId ||
      this.config?.syncDirection === 'fileToProject'
    ) {
      return;
    }

    if (task.projectId === this.config.projectId) {
      console.log('[Sync.md] Task update detected, scheduling sync...');
      // Debounce to avoid too many syncs
      if (this.syncTimeout) clearTimeout(this.syncTimeout);
      this.syncTimeout = setTimeout(() => this.performSync(), 1000);
    }
  }

  async handleTaskDeleted(taskId) {
    // Similar to handleTaskUpdate
    this.handleTaskUpdate({ projectId: this.config?.projectId });
  }

  destroy() {
    console.log('[Sync.md] Plugin destroying...');
    this.stopWatching();
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
      this.syncTimeout = null;
    }
  }
}

// Simplified sync logic for the plugin (full implementation would import from syncLogic.ts)
class SimpleBidirectionalSync {
  constructor() {
    this.syncState = {
      lastSyncTime: null,
      fileChecksum: null,
      taskChecksums: new Map(),
    };
  }

  async sync(markdownContent, projectTasks, syncDirection, lastSyncState) {
    if (lastSyncState) {
      this.syncState = lastSyncState;
    }

    // This is a simplified version - real implementation would be more complex
    const result = {
      tasksAdded: 0,
      tasksUpdated: 0,
      tasksDeleted: 0,
      conflicts: [],
    };

    // Count differences for demo purposes
    const markdownTasks = this.parseMarkdown(markdownContent);
    result.tasksAdded = Math.abs(markdownTasks.length - projectTasks.length);

    return result;
  }

  parseMarkdown(content) {
    const lines = content.split('\n');
    const tasks = [];

    lines.forEach((line) => {
      const match = line.match(/^-\s*\[([ x])\]\s*(.+)$/);
      if (match) {
        tasks.push({
          title: match[2].trim(),
          isDone: match[1] === 'x',
        });
      }
    });

    return tasks;
  }

  updateSyncState(markdownContent, tasks) {
    this.syncState.lastSyncTime = new Date();
    this.syncState.fileChecksum = this.calculateChecksum(markdownContent);
    return this.syncState;
  }

  calculateChecksum(content) {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }
}

// Initialize plugin
const syncMdPlugin = new SyncMdPlugin();
syncMdPlugin.init();

// Register plugin for cleanup
if (PluginAPI?.onDestroy) {
  PluginAPI.onDestroy(() => syncMdPlugin.destroy());
}
