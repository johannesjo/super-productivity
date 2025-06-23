import { Component, createSignal, onMount, Show, For } from 'solid-js';
import { SyncConfig, Project, SyncDirection } from './types';
import { PluginAPI } from './pluginApi';

const App: Component = () => {
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

  onMount(async () => {
    await initialize();
  });

  const initialize = async () => {
    try {
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

  const syncNow = async () => {
    try {
      setIsLoading(true);
      showStatus('Syncing...', 'info');

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
    // For now, just simulate the response
    // In the real implementation, this would communicate with the plugin
    console.log('Sending message to plugin:', message);

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, message: 'Operation completed' });
      }, 500);
    });
  };

  const showStatus = (message: string, type: 'success' | 'error' | 'info') => {
    setStatus({ message, type });
    setTimeout(() => setStatus(null), 5000);
  };

  return (
    <div class="sync-md-app">
      <h2>Sync.md Configuration</h2>

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
