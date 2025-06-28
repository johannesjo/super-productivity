import { Component, createSignal, onMount, Show, For } from 'solid-js';
import { SyncConfig, Project, SyncDirection } from './types';
import { PluginAPI } from './plugin';

const App: Component = () => {
  console.log('Sync-MD Plugin: App component created');

  const [projects, setProjects] = createSignal<Project[]>([]);
  const [config, setConfig] = createSignal<SyncConfig | null>(null);
  const [filePath, setFilePath] = createSignal('');
  const [projectId, setProjectId] = createSignal('');
  const [syncDirection, setSyncDirection] = createSignal<SyncDirection>('bidirectional');
  const [status, setStatus] = createSignal<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);
  const [isLoading, setIsLoading] = createSignal(false);
  const [lastSync, setLastSync] = createSignal<Date | null>(null);
  const [taskCount, setTaskCount] = createSignal(0);
  const [preview, setPreview] = createSignal<string | null>(null);
  const [isDesktopMode, setIsDesktopMode] = createSignal(true);

  onMount(async () => {
    console.log('Sync-MD Plugin: App mounted, initializing...');
    await initialize();
  });

  const initialize = async () => {
    try {
      // Check if we're in desktop mode
      const response = await sendMessageToPlugin({ type: 'checkDesktopMode' });
      setIsDesktopMode(response?.isDesktop !== false);

      // Load projects
      const projectList = await PluginAPI.getAllProjects();
      setProjects(projectList);

      // Load saved configuration
      const savedData = await PluginAPI.loadSyncedData();
      if (savedData) {
        const parsedConfig = JSON.parse(savedData);
        setConfig(parsedConfig);
        setFilePath(parsedConfig.filePath || '');
        setProjectId(parsedConfig.projectId || '');
        setSyncDirection(parsedConfig.syncDirection || 'bidirectional');

        // Load sync info
        await updateSyncInfo();
      }
    } catch (error) {
      console.error('Failed to initialize:', error);
      showStatus('Failed to initialize plugin', 'error');
    }
  };

  const updateSyncInfo = async () => {
    try {
      const message = await sendMessageToPlugin({ type: 'getSyncInfo' });
      if (message) {
        setLastSync(message.lastSyncTime ? new Date(message.lastSyncTime) : null);
        setTaskCount(message.taskCount || 0);
      }
    } catch (error) {
      console.error('Failed to get sync info:', error);
    }
  };

  const saveConfig = async () => {
    if (!filePath() || !projectId()) {
      showStatus('Please fill in all required fields', 'error');
      return;
    }

    const newConfig: SyncConfig = {
      filePath: filePath(),
      projectId: projectId(),
      syncDirection: syncDirection(),
      enabled: true,
    };

    try {
      setIsLoading(true);
      await PluginAPI.persistDataSynced(JSON.stringify(newConfig));
      setConfig(newConfig);

      // Notify the plugin about config change
      await sendMessageToPlugin({
        type: 'configUpdated',
        config: newConfig,
      });

      showStatus('Configuration saved successfully', 'success');
      await updateSyncInfo();
    } catch (error) {
      console.error('Failed to save config:', error);
      showStatus('Failed to save configuration', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async () => {
    if (!filePath()) {
      showStatus('Please enter a file path', 'error');
      return;
    }

    try {
      setIsLoading(true);
      showStatus('Testing file access...', 'info');

      // Try direct node script execution first to avoid context clearing issue
      if (window.PluginAPI?.executeNodeScript) {
        try {
          const result = await window.PluginAPI.executeNodeScript({
            script: `
              const fs = require('fs');
              const path = require('path');
              
              try {
                const absolutePath = path.resolve(args[0]);
                if (!fs.existsSync(absolutePath)) {
                  return { success: false, error: 'File not found' };
                }
                const content = fs.readFileSync(absolutePath, 'utf8');
                const lines = content.split('\\n').slice(0, 10);
                return { 
                  success: true, 
                  preview: lines.join('\\n') + (content.split('\\n').length > 10 ? '\\n...' : '')
                };
              } catch (error) {
                return { success: false, error: error.message };
              }
            `,
            args: [filePath()],
            timeout: 5000,
          });

          if (result.success && result.result?.success) {
            showStatus('File is accessible and valid!', 'success');
            setPreview(result.result.preview);
          } else {
            showStatus(result.result?.error || 'Failed to access file', 'error');
          }
          return;
        } catch (error) {
          console.log('Direct node script failed, falling back to message handler');
        }
      }

      // Fallback to message handler
      const response = await sendMessageToPlugin({
        type: 'testFile',
        filePath: filePath(),
      });

      if (response?.success) {
        showStatus('File is accessible and valid!', 'success');
        if (response.preview) {
          setPreview(response.preview);
        }
      } else {
        showStatus(response?.error || 'Failed to access file', 'error');
      }
    } catch (error) {
      console.error('Test failed:', error);
      showStatus('Test failed: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const testNodeScript = async () => {
    try {
      setIsLoading(true);
      showStatus('Testing node script execution...', 'info');

      // Test simple node script execution
      const result = await PluginAPI.executeNodeScript({
        script: `
          const fs = require('fs');
          const path = require('path');
          
          // Test basic operations
          const testData = {
            message: 'Node script execution works!',
            timestamp: new Date().toISOString(),
            nodeVersion: process.version,
            platform: process.platform,
            canAccessFs: typeof fs.readFileSync === 'function',
            canAccessPath: typeof path.join === 'function'
          };
          
          return testData;
        `,
        timeout: 5000,
      });

      if (result.success) {
        console.log('Node script test result:', result.result);
        showStatus(
          `Success! Node ${result.result.nodeVersion} on ${result.result.platform}`,
          'success',
        );
      } else {
        showStatus(`Node script test failed: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Node script test failed:', error);
      showStatus('Node script test failed: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const syncNow = async () => {
    if (!config() || !config().enabled) {
      showStatus('Please save configuration first', 'error');
      return;
    }

    try {
      setIsLoading(true);
      showStatus('Syncing...', 'info');

      // Try direct sync first to avoid message handler issues
      if (window.PluginAPI?.executeNodeScript) {
        try {
          // Read file content
          const readResult = await window.PluginAPI.executeNodeScript({
            script: `
              const fs = require('fs');
              const path = require('path');
              
              try {
                const absolutePath = path.resolve(args[0]);
                const content = fs.readFileSync(absolutePath, 'utf8');
                return { success: true, content };
              } catch (error) {
                return { success: false, error: error.message };
              }
            `,
            args: [config().filePath],
            timeout: 5000,
          });

          if (!readResult.success || !readResult.result?.success) {
            throw new Error(readResult.result?.error || 'Failed to read file');
          }

          const fileContent = readResult.result.content;

          // Get tasks from the project
          const allTasks = await PluginAPI.getTasks();
          const projectTasks = allTasks.filter(
            (task) => task.projectId === config().projectId,
          );

          // Get project data to order tasks correctly
          const projects = await PluginAPI.getAllProjects();
          const currentProject = projects.find((p) => p.id === config().projectId);

          // Reorder tasks based on project.taskIds if available
          let orderedProjectTasks = projectTasks;
          if (currentProject?.taskIds) {
            const taskMap = new Map(projectTasks.map((t) => [t.id, t]));
            orderedProjectTasks = currentProject.taskIds
              .map((id) => taskMap.get(id))
              .filter((task): task is any => task !== undefined);
          }

          // Import sync logic directly
          const { replicateMD } = await import('./syncLogic');

          // Perform replication
          const result = replicateMD(
            fileContent,
            orderedProjectTasks,
            config().syncDirection,
          );

          if (!result.success) {
            throw new Error(result.error || 'Sync failed');
          }

          // Apply operations
          if (
            config().syncDirection === 'fileToProject' ||
            config().syncDirection === 'bidirectional'
          ) {
            // Keep track of task ID mappings for new tasks
            const taskIdMap = new Map<string, string>(); // tempId -> realId

            // Apply task operations
            for (const operation of result.operations) {
              if (operation.target === 'task') {
                try {
                  switch (operation.type) {
                    case 'add':
                      if (operation.data) {
                        const newTaskId = await PluginAPI.addTask({
                          title: operation.data.title || '',
                          isDone: operation.data.isDone || false,
                          projectId: config().projectId,
                          parentId: operation.parentId || undefined,
                          notes: operation.data.notes || undefined,
                        });
                        // Store mapping if we have a temporary ID
                        if (operation.tempId) {
                          taskIdMap.set(operation.tempId, newTaskId);
                        }
                      }
                      break;
                    case 'update':
                      if (operation.taskId && operation.data) {
                        await PluginAPI.updateTask(operation.taskId, {
                          title: operation.data.title,
                          isDone: operation.data.isDone,
                        });
                      }
                      break;
                    case 'delete':
                      if (operation.taskId) {
                        await PluginAPI.updateTask(operation.taskId, {
                          isDone: true,
                          title: `[DELETED] ${operation.data?.title || 'Task'}`,
                        });
                      }
                      break;
                  }
                } catch (error) {
                  console.error(`Failed to ${operation.type} task:`, error);
                }
              }
            }

            // After all operations are complete, set the task order based on markdown
            // Parse markdown to get the order
            const { parseMarkdownToTree } = await import('./syncLogic');
            const markdownTree = parseMarkdownToTree(fileContent);

            // Get all current tasks to build the order
            const updatedTasks = await PluginAPI.getTasks();
            const projectTasks = updatedTasks.filter(
              (task) => task.projectId === config().projectId,
            );

            // Build ordered task IDs from markdown structure
            const orderedTaskIds: string[] = [];
            const processTreeForOrder = (nodes: any[]) => {
              nodes.forEach((node) => {
                // Find the corresponding task
                const task = projectTasks.find(
                  (t) => (node.id && t.id === node.id) || t.title === node.title,
                );
                if (task && !task.parentId) {
                  // Only include root tasks
                  orderedTaskIds.push(task.id);
                }
              });
            };
            processTreeForOrder(markdownTree);

            // Add any tasks not in markdown at the end
            projectTasks.forEach((task) => {
              if (!task.parentId && !orderedTaskIds.includes(task.id)) {
                orderedTaskIds.push(task.id);
              }
            });

            // Apply the order
            if (orderedTaskIds.length > 0) {
              try {
                await PluginAPI.reorderTasks(
                  orderedTaskIds,
                  config().projectId,
                  'project',
                );
                console.log('Reordered tasks to match markdown order:', orderedTaskIds);
              } catch (error) {
                console.error('Failed to reorder tasks:', error);
              }
            }
          }

          if (
            config().syncDirection === 'projectToFile' ||
            config().syncDirection === 'bidirectional'
          ) {
            if (result.updatedMarkdown !== fileContent) {
              // Write file
              const writeResult = await window.PluginAPI.executeNodeScript({
                script: `
                  const fs = require('fs');
                  const path = require('path');
                  
                  try {
                    const absolutePath = path.resolve(args[0]);
                    const content = args[1];
                    
                    // Create backup
                    if (fs.existsSync(absolutePath)) {
                      const backupPath = absolutePath + '.backup';
                      fs.copyFileSync(absolutePath, backupPath);
                    }
                    
                    // Write new content
                    fs.writeFileSync(absolutePath, content, 'utf8');
                    return { success: true };
                  } catch (error) {
                    return { success: false, error: error.message };
                  }
                `,
                args: [config().filePath, result.updatedMarkdown],
                timeout: 5000,
              });

              if (!writeResult.success || !writeResult.result?.success) {
                throw new Error(writeResult.result?.error || 'Failed to write file');
              }
            }
          }

          showStatus(
            `Sync completed! Added: ${result.tasksAdded}, Updated: ${result.tasksUpdated}`,
            'success',
          );
          await updateSyncInfo();
          return;
        } catch (error) {
          console.log('Direct sync failed, falling back to message handler:', error);
        }
      }

      // Fallback to message handler
      const response = await sendMessageToPlugin({ type: 'syncNow' });

      if (response?.success) {
        showStatus('Sync completed successfully', 'success');
        await updateSyncInfo();
      } else {
        showStatus(response?.error || 'Sync failed', 'error');
      }
    } catch (error) {
      console.error('Sync failed:', error);
      showStatus('Sync failed: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessageToPlugin = async (message: any): Promise<any> => {
    console.log('Sending message to plugin:', message);

    return new Promise((resolve) => {
      const messageId = Date.now().toString();

      // Listen for response - try multiple event types
      const handleResponse = (event: MessageEvent) => {
        console.log('Received message event:', event.data);

        // Check for direct response
        if (event.data?.messageId === messageId) {
          window.removeEventListener('message', handleResponse);
          resolve(event.data.response || event.data);
        }
        // Check for plugin framework response format
        else if (
          event.data?.type === 'PLUGIN_MESSAGE_RESPONSE' &&
          event.data?.messageId === messageId
        ) {
          window.removeEventListener('message', handleResponse);
          resolve(event.data.response || event.data.result);
        }
      };

      window.addEventListener('message', handleResponse);

      // Send message to plugin
      window.parent.postMessage(
        {
          type: 'PLUGIN_MESSAGE',
          message,
          messageId,
        },
        '*',
      );

      // Timeout after 10 seconds
      setTimeout(() => {
        window.removeEventListener('message', handleResponse);
        resolve({ success: false, error: 'Request timeout' });
      }, 10000);
    });
  };

  const showStatus = (message: string, type: 'success' | 'error' | 'info') => {
    setStatus({ message, type });
    setTimeout(() => setStatus(null), 5000);
  };

  return (
    <div class="sync-md-app">
      <h2>Sync.md Configuration</h2>

      <Show when={!isDesktopMode()}>
        <div class="status error">
          This plugin requires the desktop version of Super Productivity to access local
          files. Please use the Electron app instead of the web version.
        </div>
      </Show>

      <div class="field-group">
        <label for="filePath">Markdown File Path</label>
        <input
          type="text"
          id="filePath"
          value={filePath()}
          onInput={(e) => setFilePath(e.currentTarget.value)}
          placeholder="/path/to/your/file.md"
          disabled={isLoading()}
        />
        <div class="help-text">Path to the markdown file to sync with</div>
      </div>

      <div class="field-group">
        <label for="projectId">Project</label>
        <select
          id="projectId"
          value={projectId()}
          onChange={(e) => setProjectId(e.currentTarget.value)}
          disabled={isLoading()}
        >
          <option value="">Select a project...</option>
          <For each={projects()}>
            {(project) => <option value={project.id}>{project.title}</option>}
          </For>
        </select>
        <div class="help-text">Tasks will be synced to this project</div>
      </div>

      <div class="field-group">
        <label for="syncDirection">Sync Direction</label>
        <select
          id="syncDirection"
          value={syncDirection()}
          onChange={(e) => setSyncDirection(e.currentTarget.value as SyncDirection)}
          disabled={isLoading()}
        >
          <option value="bidirectional">Bidirectional (Two-way sync)</option>
          <option value="fileToProject">File → Project only</option>
          <option value="projectToFile">Project → File only</option>
        </select>
        <div class="help-text">Control how changes are synchronized</div>
      </div>

      <div class="button-group">
        <button
          class="btn-primary"
          onClick={saveConfig}
          disabled={isLoading()}
        >
          Save Configuration
        </button>
        <button
          class="btn-secondary"
          onClick={testConnection}
          disabled={isLoading()}
        >
          Test Connection
        </button>
        <button
          class="btn-secondary"
          onClick={testNodeScript}
          disabled={isLoading()}
        >
          Test Node Script
        </button>
      </div>

      <Show when={status()}>
        <div class={`status ${status()!.type}`}>{status()!.message}</div>
      </Show>

      <Show when={config()}>
        <div class="sync-info">
          <h3>Sync Status</h3>
          <div class="sync-item">
            <span class="sync-item-label">Status:</span>
            <span class="sync-item-value">
              {config()?.enabled ? 'Active' : 'Not configured'}
            </span>
          </div>
          <div class="sync-item">
            <span class="sync-item-label">Last sync:</span>
            <span class="sync-item-value">
              {lastSync() ? lastSync()!.toLocaleString() : 'Never'}
            </span>
          </div>
          <div class="sync-item">
            <span class="sync-item-label">Tasks synced:</span>
            <span class="sync-item-value">{taskCount()}</span>
          </div>
          <div class="button-group">
            <button
              class="btn-secondary"
              onClick={syncNow}
              disabled={isLoading()}
            >
              Sync Now
            </button>
          </div>
        </div>
      </Show>

      <Show when={preview()}>
        <div class="preview-container">
          <h3>File Preview</h3>
          <pre>{preview()}</pre>
        </div>
      </Show>
    </div>
  );
};

export default App;
