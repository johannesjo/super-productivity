// Sync.md Plugin for SuperProductivity
// This plugin syncs markdown files with project tasks

class SyncMdPlugin {
  constructor() {
    this.config = null;
    this.watchInterval = null;
    this.lastSyncTime = null;
    this.lastFileContent = null;
    this.lastModifiedTime = null;
    this.isWatching = false;
    this.syncInProgress = false;
    this.ignoreNextFileChange = false;
    this.orderChangeTimeout = null; // Debounce timer for order changes
  }

  async init() {
    console.log('[Sync.md] Plugin initializing...');

    // Register message handler for iframe communication
    if (PluginAPI?.onMessage) {
      PluginAPI.onMessage((message) => this.handleMessage(message));
    }

    // Register hook for task changes
    if (PluginAPI?.registerHook && PluginAPI?.Hooks) {
      // Use the correct hook names from PluginHooks enum
      PluginAPI.registerHook(PluginAPI.Hooks.TASK_UPDATE, (task) => {
        console.log('[Sync.md] Task update hook triggered:', task);
        this.handleTaskUpdate(task);
      });
      PluginAPI.registerHook(PluginAPI.Hooks.TASK_DELETE, (taskId) => {
        console.log('[Sync.md] Task delete hook triggered:', taskId);
        this.handleTaskDeleted(taskId);
      });
      // Register ACTION hook to catch task order changes
      PluginAPI.registerHook(PluginAPI.Hooks.ACTION, (action) => {
        // Listen for task movement actions
        if (
          action &&
          action.type &&
          (action.type.includes('moveTask') ||
            action.type.includes('reorder') ||
            action.type.includes('Move Task'))
        ) {
          console.log('[Sync.md] Task order change action detected:', action.type);
          this.handleTaskOrderChange();
        }
      });
      // Note: There's no direct "task added" hook, it comes through taskUpdate
    }

    // Load saved configuration
    await this.loadConfig();

    // Start watching if configured
    if (this.config?.filePath && this.config?.projectId) {
      // Always do an initial sync to ensure file matches project state
      console.log('[Sync.md] Performing initial sync...');

      if (this.config.syncDirection === 'fileToProject') {
        // Read file and sync to project
        await this.checkFileForChanges();
      } else {
        // Sync project to file first to ensure clean state
        await this.syncProjectToFile();
      }

      // Then start watching for changes
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
          if (message.config?.filePath && message.config?.projectId) {
            await this.startWatching();
          }
          return { success: true };

        case 'testConnection':
          return await this.testConnection(message.filePath);

        case 'browseFile':
          return await this.browseForFile(message.filters);

        case 'readFile':
          return await this.readFile(message.filePath);

        case 'getSyncInfo':
          // Get current task count
          let taskCount = 0;
          if (this.config?.projectId) {
            const allTasks = await PluginAPI.getTasks();
            taskCount = allTasks.filter(
              (task) => task.projectId === this.config.projectId,
            ).length;
          }
          return {
            isWatching: this.isWatching,
            lastSyncTime: this.lastSyncTime,
            taskCount: taskCount,
          };

        case 'syncNow':
          console.log('[Sync.md] Manual sync requested');
          // Always do a complete sync based on sync direction
          if (this.config?.syncDirection === 'fileToProject') {
            // Force read from file
            this.lastModifiedTime = null; // Reset to force update
            await this.checkFileForChanges();
          } else {
            // Force complete rebuild of markdown
            await this.syncProjectToFile();
          }
          return { success: true };

        default:
          console.warn('[Sync.md] Unknown message type:', message.type);
          return null;
      }
    } catch (error) {
      console.error('[Sync.md] Error handling message:', error);
      throw error;
    }
  }

  async loadConfig() {
    try {
      const data = await PluginAPI.loadSyncedData();
      if (data) {
        // Data is returned as a string, need to parse it
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
        // Extract the config from the data
        this.config = parsedData.syncMdConfig || parsedData;
        console.log('[Sync.md] Loaded config:', this.config);
      }
    } catch (error) {
      console.error('[Sync.md] Error loading config:', error);
    }
  }

  async saveConfig(config) {
    try {
      this.config = config;
      // persistDataSynced expects a string
      const dataToSave = JSON.stringify({ syncMdConfig: config });
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
      console.warn(
        '[Sync.md] Cannot start watching: missing config or executeNodeScript permission',
      );
      return;
    }

    try {
      // Stop existing watcher if any
      if (this.watchInterval) {
        await this.stopWatching();
      }

      // Initial read
      await this.checkFileForChanges();

      // Start polling interval (check every 2 seconds)
      this.watchInterval = setInterval(() => {
        this.checkFileForChanges();
      }, 2000);

      this.isWatching = true;
      console.log('[Sync.md] Started watching file:', this.config.filePath);
    } catch (error) {
      console.error('[Sync.md] Error starting watcher:', error);
      this.isWatching = false;
    }
  }

  async stopWatching() {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = null;
      console.log('[Sync.md] Stopped watching file');
    }
    this.isWatching = false;
  }

  async checkFileForChanges() {
    if (!this.config?.filePath || !PluginAPI?.executeNodeScript) {
      return;
    }

    try {
      const checkScript = `
        const fs = require('fs');
        const filePath = ${JSON.stringify(this.config.filePath)};
        
        try {
          const stats = fs.statSync(filePath);
          const content = fs.readFileSync(filePath, 'utf8');
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
        script: checkScript,
        timeout: 5000,
      });

      if (result.success && result.result) {
        const output = typeof result.result === 'string' ? result.result : '';
        const data = JSON.parse(output);

        if (data.exists && data.content) {
          // Check if file has changed
          const hasChanged =
            this.lastModifiedTime !== data.modifiedTime ||
            this.lastFileContent !== data.content;

          if (hasChanged) {
            // Check if we should ignore this change (from our own update)
            if (this.ignoreNextFileChange) {
              console.log('[Sync.md] Ignoring file change (self-triggered)');
              this.ignoreNextFileChange = false;
              this.lastModifiedTime = data.modifiedTime;
              this.lastFileContent = data.content;
              return;
            }

            console.log('[Sync.md] File changed, syncing...');
            this.lastModifiedTime = data.modifiedTime;
            this.lastFileContent = data.content;
            await this.syncFileToProject(data.content);
          }
        } else if (!data.exists) {
          console.error('[Sync.md] File no longer exists:', data.error);
        }
      }
    } catch (error) {
      console.error('[Sync.md] Error checking file:', error);
    }
  }

  async syncFileToProject(content) {
    if (
      this.syncInProgress ||
      !this.config?.projectId ||
      this.config?.syncDirection === 'projectToFile'
    ) {
      return;
    }

    this.syncInProgress = true;

    try {
      // Parse markdown content
      const { tasks: markdownTasks } = this.parseMarkdown(content);

      if (!markdownTasks || markdownTasks.length === 0) {
        console.log('[Sync.md] No tasks found in markdown');
        this.syncInProgress = false;
        return;
      }

      // Get existing project tasks
      const allTasks = await PluginAPI.getTasks();
      const projectTasks = allTasks.filter(
        (task) => task.projectId === this.config.projectId && !task.parentId,
      );

      // Sync structure by position
      await this.syncTaskStructure(markdownTasks, projectTasks, allTasks);

      this.lastSyncTime = new Date();
      console.log('[Sync.md] File to project sync completed');
    } catch (error) {
      console.error('[Sync.md] Error syncing file to project:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  parseMarkdown(content) {
    const lines = content.split('\n');
    const parsedLines = [];
    let lineNumber = 0;

    // First pass: parse all lines into structured data
    for (const line of lines) {
      lineNumber++;

      // Calculate indentation level
      const indentMatch = line.match(/^(\s*)/);
      let indentLevel = 0;
      if (indentMatch && indentMatch[1]) {
        const whitespace = indentMatch[1];
        // Count tabs as 1 level each, spaces as 1 level per 2 spaces
        const tabCount = (whitespace.match(/\t/g) || []).length;
        const spaceCount = (whitespace.match(/ /g) || []).length;
        indentLevel = tabCount + Math.floor(spaceCount / 2);
      }

      const trimmed = line.trim();
      if (!trimmed) continue;

      // Match checkbox format: - [ ] title or - [x] title
      const checkboxMatch = trimmed.match(/^-\s*\[([ x])\]\s*(.+)$/);
      if (checkboxMatch) {
        const isDone = checkboxMatch[1] === 'x';
        const title = checkboxMatch[2].trim();

        parsedLines.push({
          title,
          isDone,
          lineNumber,
          indentLevel,
          originalLine: line,
        });
        continue;
      }

      // Also support plain bullet format: - title or * title
      const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
      if (bulletMatch) {
        const title = bulletMatch[1].trim();

        parsedLines.push({
          title,
          isDone: false,
          lineNumber,
          indentLevel,
          originalLine: line,
        });
      }
    }

    // Second pass: build hierarchical structure
    const tasks = [];
    let i = 0;

    while (i < parsedLines.length) {
      const currentLine = parsedLines[i];

      // Only process top-level items (indentLevel 0) as main tasks
      if (currentLine.indentLevel === 0) {
        const task = {
          title: currentLine.title,
          isDone: currentLine.isDone,
          lineNumber: currentLine.lineNumber,
          indentLevel: currentLine.indentLevel,
          subTasks: [],
        };

        // Look ahead for nested items
        let j = i + 1;
        let firstSubTaskLevel = null;

        // Find all subtasks for this main task
        while (j < parsedLines.length && parsedLines[j].indentLevel > 0) {
          const subLine = parsedLines[j];

          // Set the first subtask level if not set
          if (firstSubTaskLevel === null) {
            firstSubTaskLevel = subLine.indentLevel;
          }

          // Only add direct subtasks (at the first subtask level)
          if (subLine.indentLevel === firstSubTaskLevel) {
            task.subTasks.push({
              title: subLine.title,
              isDone: subLine.isDone,
              lineNumber: subLine.lineNumber,
              indentLevel: subLine.indentLevel,
            });
          }
          // Skip deeper nested items (they would be sub-subtasks)

          j++;
        }

        tasks.push(task);
        i = j; // Skip the nested items we just processed
      } else {
        // This shouldn't happen if we process correctly, but skip just in case
        i++;
      }
    }

    console.log(
      '[Sync.md] Parsed tasks:',
      tasks.length,
      'main tasks with subtasks:',
      tasks.filter((t) => t.subTasks.length > 0).length,
    );

    // Debug: log task structure
    tasks.forEach((task, i) => {
      console.log(
        `[Sync.md] Task ${i}: "${task.title}" - ${task.subTasks.length} subtasks`,
      );
      task.subTasks.forEach((subTask, j) => {
        console.log(`[Sync.md]   Subtask ${j}: "${subTask.title}"`);
      });
    });

    return { tasks };
  }

  async getProjectTasks(projectId) {
    try {
      const tasks = await PluginAPI.getTasks();
      return tasks.filter((task) => task.projectId === projectId);
    } catch (error) {
      console.error('[Sync.md] Error getting project tasks:', error);
      return [];
    }
  }

  async waitForTask(taskId, maxRetries = 10) {
    for (let i = 0; i < maxRetries; i++) {
      const tasks = await PluginAPI.getTasks();
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        console.log(`[Sync.md] Task ${taskId} found after ${i + 1} attempts`);
        return task;
      }
      // Wait a bit before retrying
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    console.warn(`[Sync.md] Task ${taskId} not found after ${maxRetries} attempts`);
    return null;
  }

  async syncTaskStructure(markdownTasks, projectMainTasks, allProjectTasks) {
    console.log('[Sync.md] Syncing task structure...');
    const mainTaskIds = [];
    let hasNewMainTasks = false;

    // Process each markdown task by position
    for (let i = 0; i < markdownTasks.length; i++) {
      const mdTask = markdownTasks[i];
      let projectTask = projectMainTasks[i];

      // If there's no project task at this position, create one
      if (!projectTask) {
        console.log(`[Sync.md] Creating task at position ${i}: ${mdTask.title}`);
        const taskId = await PluginAPI.addTask({
          title: mdTask.title,
          projectId: this.config.projectId,
          isDone: mdTask.isDone,
        });
        mainTaskIds.push(taskId);
        hasNewMainTasks = true;

        // Wait for the task to be available in the store
        await this.waitForTask(taskId);

        // Handle subtasks
        for (let j = 0; j < mdTask.subTasks.length; j++) {
          const mdSubTask = mdTask.subTasks[j];
          console.log(`[Sync.md] Creating subtask: ${mdSubTask.title}`);
          const subTaskId = await PluginAPI.addTask({
            title: mdSubTask.title,
            parentId: taskId,
            projectId: this.config.projectId,
            isDone: mdSubTask.isDone,
          });
          // Wait for the subtask to be available
          await this.waitForTask(subTaskId);
        }
      } else {
        // Update existing task if needed
        mainTaskIds.push(projectTask.id);

        if (projectTask.title !== mdTask.title || projectTask.isDone !== mdTask.isDone) {
          console.log(`[Sync.md] Updating task at position ${i}: ${mdTask.title}`);
          await PluginAPI.updateTask(projectTask.id, {
            title: mdTask.title,
            isDone: mdTask.isDone,
          });
        }

        // Sync subtasks
        const projectSubTasks = allProjectTasks.filter(
          (task) => task.parentId === projectTask.id,
        );
        console.log(
          `[Sync.md] Syncing subtasks for "${projectTask.title}" (${projectTask.id}): ${projectSubTasks.length} existing, ${mdTask.subTasks.length} in markdown`,
        );
        await this.syncSubTasks(mdTask.subTasks, projectSubTasks, projectTask.id);
      }
    }

    // Remove extra project tasks that don't exist in markdown
    for (let i = markdownTasks.length; i < projectMainTasks.length; i++) {
      const taskToRemove = projectMainTasks[i];
      console.log(
        `[Sync.md] Task at position ${i} exists in project but not in markdown: ${taskToRemove.title}`,
      );
      // Note: We can't delete tasks via API, so we'll log this
      // In future, we might want to move them to a different project or archive them
    }

    // Reorder ONLY main tasks in the project (not subtasks!)
    // Subtasks should only exist in their parent's subTaskIds array
    if (mainTaskIds.length > 0 && PluginAPI.reorderTasks) {
      // Always validate task IDs before reordering to prevent errors
      const currentTasks = await PluginAPI.getTasks();
      console.log(
        `[Sync.md] Validating ${mainTaskIds.length} task IDs for project ${this.config.projectId}`,
      );

      const validTaskIds = mainTaskIds.filter((taskId) => {
        const task = currentTasks.find((t) => t.id === taskId);
        if (!task) {
          console.log(`[Sync.md] Task ${taskId} not found in current tasks`);
          return false;
        }

        const isValid = task.projectId === this.config.projectId && !task.parentId;

        console.log(
          `[Sync.md] Task ${taskId} validation: projectId=${task.projectId} (expected ${this.config.projectId}), parentId=${task.parentId}, valid=${isValid}`,
        );

        return isValid;
      });

      if (validTaskIds.length > 0) {
        console.log('[Sync.md] Reordering main tasks in project:', validTaskIds);
        console.log(
          `[Sync.md] Original task IDs: ${mainTaskIds.length}, Valid task IDs: ${validTaskIds.length}`,
        );

        try {
          await PluginAPI.reorderTasks(validTaskIds, this.config.projectId, 'project');
        } catch (error) {
          console.error('[Sync.md] Error reordering tasks:', error);
          console.error('[Sync.md] Failed task IDs:', validTaskIds);
          console.error('[Sync.md] Project ID:', this.config.projectId);
        }
      } else {
        console.log(
          '[Sync.md] No valid tasks to reorder for project:',
          this.config.projectId,
        );
      }
    }
  }

  async syncSubTasks(markdownSubTasks, projectSubTasks, parentId) {
    const subTaskIds = [];
    let hasNewSubTasks = false;

    // Process each markdown subtask by position
    for (let i = 0; i < markdownSubTasks.length; i++) {
      const mdSubTask = markdownSubTasks[i];
      let projectSubTask = projectSubTasks[i];

      // If there's no project subtask at this position, create one
      if (!projectSubTask) {
        console.log(
          `[Sync.md] Creating subtask at position ${i}: "${mdSubTask.title}" for parent ${parentId}`,
        );
        const subTaskId = await PluginAPI.addTask({
          title: mdSubTask.title,
          parentId: parentId,
          projectId: this.config.projectId,
          isDone: mdSubTask.isDone,
        });
        subTaskIds.push(subTaskId);
        hasNewSubTasks = true;
        // Wait for the subtask to be available
        await this.waitForTask(subTaskId);
      } else {
        // Update existing subtask if needed
        subTaskIds.push(projectSubTask.id);

        if (
          projectSubTask.title !== mdSubTask.title ||
          projectSubTask.isDone !== mdSubTask.isDone
        ) {
          console.log(
            `[Sync.md] Updating subtask at position ${i}: "${projectSubTask.title}" -> "${mdSubTask.title}"`,
          );
          await PluginAPI.updateTask(projectSubTask.id, {
            title: mdSubTask.title,
            isDone: mdSubTask.isDone,
          });
        } else {
          console.log(
            `[Sync.md] Subtask at position ${i} unchanged: "${projectSubTask.title}"`,
          );
        }
      }
    }

    // Log extra project subtasks
    for (let i = markdownSubTasks.length; i < projectSubTasks.length; i++) {
      const subTaskToRemove = projectSubTasks[i];
      console.log(
        `[Sync.md] Subtask at position ${i} exists in project but not in markdown: ${subTaskToRemove.title}`,
      );
    }

    // Reorder subtasks if needed (skip if we just created new subtasks)
    if (subTaskIds.length > 0 && PluginAPI.reorderTasks && !hasNewSubTasks) {
      // Double-check that all subtasks still belong to this parent
      // (they might have been created but not yet added to parent's subTaskIds)
      const currentTasks = await PluginAPI.getTasks();
      const parentTask = currentTasks.find((t) => t.id === parentId);

      if (parentTask) {
        // Check if parent has subTaskIds array (it might be undefined or empty)
        if (parentTask.subTaskIds && parentTask.subTaskIds.length > 0) {
          const validSubTaskIds = subTaskIds.filter((taskId) =>
            parentTask.subTaskIds.includes(taskId),
          );

          if (validSubTaskIds.length > 0) {
            console.log(
              `[Sync.md] Reordering ${validSubTaskIds.length} subtasks for parent ${parentId}`,
            );
            await PluginAPI.reorderTasks(validSubTaskIds, parentId, 'task');
          } else {
            console.log(`[Sync.md] No valid subtasks to reorder for parent ${parentId}`);
          }
        } else {
          console.log(
            `[Sync.md] Parent task ${parentId} has no subtasks in subTaskIds array yet (might be newly created)`,
          );
        }
      } else {
        console.log(`[Sync.md] Parent task ${parentId} not found`);
      }
    } else if (hasNewSubTasks) {
      console.log(
        `[Sync.md] Skipping reorder - new subtasks were created and are already in correct order`,
      );
    }
  }

  async testConnection(filePath) {
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
          content: content.substring(0, 500)
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

  async browseForFile(filters) {
    if (!PluginAPI?.executeNodeScript) {
      throw new Error('Node execution permission required');
    }

    // Use electron dialog if available
    const browseScript = `
      const { dialog } = require('electron');

      const result = dialog.showOpenDialogSync({
        properties: ['openFile'],
        filters: ${JSON.stringify(filters || [])}
      });

      console.log(JSON.stringify({
        filePath: result ? result[0] : null
      }));
    `;

    try {
      const result = await PluginAPI.executeNodeScript({
        script: browseScript,
        timeout: 5000,
      });

      if (result.success && result.result) {
        const output = typeof result.result === 'string' ? result.result : '';
        return JSON.parse(output);
      } else {
        throw new Error(result.error || 'Browse operation failed');
      }
    } catch (error) {
      console.error('[Sync.md] Error browsing for file:', error);
      return { filePath: null };
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
        console.log(JSON.stringify({
          content: content.substring(0, 1000) // Limit preview size
        }));
      } catch (error) {
        console.log(JSON.stringify({
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

  async handleTaskUpdate(task) {
    if (
      this.syncInProgress ||
      !this.config?.projectId ||
      this.config?.syncDirection === 'fileToProject'
    ) {
      return;
    }

    // Always do a complete sync when any task changes
    // This ensures the markdown file always reflects the exact state
    console.log('[Sync.md] Task update detected, performing complete sync...');
    await this.syncProjectToFile();
  }

  async handleTaskDeleted(taskId) {
    if (
      this.syncInProgress ||
      !this.config?.projectId ||
      this.config?.syncDirection === 'fileToProject'
    ) {
      return;
    }

    // Always sync when a task is deleted to ensure markdown reflects current state
    console.log('[Sync.md] Task deleted from project, syncing to file...');
    await this.syncProjectToFile();
  }

  async handleTaskOrderChange() {
    if (
      this.syncInProgress ||
      !this.config?.projectId ||
      this.config?.syncDirection === 'fileToProject'
    ) {
      return;
    }

    // Debounce rapid order changes
    if (this.orderChangeTimeout) {
      clearTimeout(this.orderChangeTimeout);
    }

    this.orderChangeTimeout = setTimeout(async () => {
      console.log('[Sync.md] Processing task order change...');
      await this.syncProjectToFile();
    }, 500); // Wait 500ms to batch multiple order changes
  }

  async syncProjectToFile() {
    if (!this.config?.filePath || !PluginAPI?.executeNodeScript) {
      return;
    }

    this.syncInProgress = true;
    console.log('[Sync.md] Starting complete project to file sync...');

    try {
      // Get ALL tasks from the API
      const allTasks = await PluginAPI.getTasks();

      // Filter for this project's tasks
      const projectTasks = allTasks.filter(
        (task) => task.projectId === this.config.projectId,
      );

      console.log(
        `[Sync.md] Found ${projectTasks.length} tasks for project ${this.config.projectId}`,
      );

      // Separate main tasks and subtasks
      const mainTasks = projectTasks.filter((task) => !task.parentId);
      const subTasksByParent = new Map();

      // Group subtasks by parent
      projectTasks.forEach((task) => {
        if (task.parentId) {
          if (!subTasksByParent.has(task.parentId)) {
            subTasksByParent.set(task.parentId, []);
          }
          subTasksByParent.get(task.parentId).push(task);
        }
      });

      console.log(`[Sync.md] Building markdown for ${mainTasks.length} main tasks`);

      // Build markdown content from scratch
      const markdownLines = [];

      // Process each main task in order
      for (const task of mainTasks) {
        // Add main task with checkbox
        const checkbox = task.isDone ? '[x]' : '[ ]';
        markdownLines.push(`- ${checkbox} ${task.title}`);

        // Get subtasks for this main task
        const subTasks = subTasksByParent.get(task.id) || [];

        // Add each subtask
        for (const subTask of subTasks) {
          const subCheckbox = subTask.isDone ? '[x]' : '[ ]';
          markdownLines.push(`  - ${subCheckbox} ${subTask.title}`);

          // Add notes if present
          if (subTask.notes) {
            const noteLines = subTask.notes.split('\n');
            noteLines.forEach((line) => {
              if (line.trim()) {
                markdownLines.push(`    ${line}`);
              }
            });
          }
        }

        // Add main task notes if present
        if (task.notes && subTasks.length === 0) {
          const noteLines = task.notes.split('\n');
          noteLines.forEach((line) => {
            if (line.trim()) {
              markdownLines.push(`  ${line}`);
            }
          });
        }
      }

      const markdownContent = markdownLines.join('\n');

      // Always write the file to ensure it's in sync
      console.log('[Sync.md] Writing complete content to file...');

      // Set flag to ignore the file change event
      this.ignoreNextFileChange = true;

      // Write complete content to file
      const writeScript = `
        const fs = require('fs');
        const content = ${JSON.stringify(markdownContent)};
        const filePath = ${JSON.stringify(this.config.filePath)};
        
        try {
          fs.writeFileSync(filePath, content, 'utf8');
          console.log('File written successfully');
        } catch (error) {
          console.error('Write error:', error.message);
          throw error;
        }
      `;

      const result = await PluginAPI.executeNodeScript({
        script: writeScript,
        timeout: 5000,
      });

      if (!result.success) {
        throw new Error(result.error || 'Write operation failed');
      }

      // Update our cached content
      this.lastFileContent = markdownContent;
      this.lastSyncTime = new Date();

      console.log(`[Sync.md] File updated successfully with ${mainTasks.length} tasks`);
    } catch (error) {
      console.error('[Sync.md] Error syncing project to file:', error);
      // Don't update lastFileContent on error
    } finally {
      this.syncInProgress = false;
    }
  }

  destroy() {
    console.log('[Sync.md] Plugin destroying...');
    this.stopWatching();
    if (this.orderChangeTimeout) {
      clearTimeout(this.orderChangeTimeout);
      this.orderChangeTimeout = null;
    }
  }
}

// Initialize plugin
const syncMdPlugin = new SyncMdPlugin();
syncMdPlugin.init();

// Register plugin for cleanup
if (PluginAPI?.onDestroy) {
  PluginAPI.onDestroy(() => syncMdPlugin.destroy());
}
