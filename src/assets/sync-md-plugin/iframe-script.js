// Iframe communication script for Sync.md plugin UI

(function () {
  let pluginAPI = null;
  let currentConfig = null;

  // Wait for plugin API to be available
  function waitForAPI() {
    if (window.PluginAPI) {
      pluginAPI = window.PluginAPI;
      console.log('[Sync.md UI] Found PluginAPI');
      initialize();
    } else {
      setTimeout(waitForAPI, 100);
    }
  }

  async function initialize() {
    console.log('[Sync.md UI] Initializing...');
    console.log('[Sync.md UI] PluginAPI available:', !!window.PluginAPI);

    try {
      // Load projects
      await loadProjects();

      // Load saved configuration
      await loadConfig();

      // Setup event listeners
      setupEventListeners();

      // Update UI state
      updateSyncInfo();
    } catch (error) {
      console.error('[Sync.md UI] Initialization error:', error);
      showStatus('Failed to initialize plugin UI', 'error');
    }
  }

  async function loadProjects() {
    try {
      console.log('[Sync.md UI] Loading projects...');
      const projects = await pluginAPI.getAllProjects();
      console.log('[Sync.md UI] Projects loaded:', projects);

      const select = document.getElementById('projectId');
      if (!select) {
        console.error('[Sync.md UI] Project select element not found');
        return;
      }

      // Clear existing options
      select.innerHTML = '<option value="">Select a project...</option>';

      // Add project options
      if (projects && projects.length > 0) {
        projects.forEach((project) => {
          const option = document.createElement('option');
          option.value = project.id;
          option.textContent = project.title;
          select.appendChild(option);
        });
      } else {
        console.warn('[Sync.md UI] No projects found');
      }
    } catch (error) {
      console.error('[Sync.md UI] Error loading projects:', error);
      showStatus('Error loading projects', 'error');
    }
  }

  async function loadConfig() {
    try {
      const dataStr = await pluginAPI.loadPersistedData();
      if (dataStr) {
        const config = JSON.parse(dataStr);
        currentConfig = config;
        document.getElementById('filePath').value = config.filePath || '';
        document.getElementById('projectId').value = config.projectId || '';
        document.getElementById('syncDirection').value =
          config.syncDirection || 'bidirectional';

        // Show sync info if configured
        if (config.filePath && config.projectId) {
          document.getElementById('syncInfo').style.display = 'block';
        }
      }
    } catch (error) {
      console.error('[Sync.md UI] Error loading config:', error);
    }
  }

  function setupEventListeners() {
    // Save button
    document.getElementById('saveBtn').addEventListener('click', saveConfig);

    // Test button
    document.getElementById('testBtn').addEventListener('click', testConnection);

    // Browse button removed - not available in web version

    // File path change
    document.getElementById('filePath').addEventListener('change', (e) => {
      if (e.target.value) {
        previewFile(e.target.value);
      }
    });
  }

  async function saveConfig() {
    const config = {
      filePath: document.getElementById('filePath').value,
      projectId: document.getElementById('projectId').value,
      syncDirection: document.getElementById('syncDirection').value,
    };

    if (!config.filePath) {
      showStatus('Please enter a file path', 'error');
      return;
    }

    if (!config.projectId) {
      showStatus('Please select a project', 'error');
      return;
    }

    try {
      // Save config through plugin API
      await pluginAPI.persistDataSynced(JSON.stringify(config));

      // Notify plugin through parent window message
      window.parent.postMessage(
        {
          type: 'PLUGIN_MESSAGE',
          data: {
            type: 'configUpdated',
            config: config,
          },
        },
        '*',
      );

      currentConfig = config;
      showStatus('Configuration saved successfully', 'success');
      document.getElementById('syncInfo').style.display = 'block';
      updateSyncInfo();
    } catch (error) {
      console.error('[Sync.md UI] Error saving config:', error);
      showStatus('Error saving configuration', 'error');
    }
  }

  async function testConnection() {
    const filePath = document.getElementById('filePath').value;

    if (!filePath) {
      showStatus('Please enter a file path', 'error');
      return;
    }

    try {
      showStatus('Testing connection...', 'info');

      // Send message to plugin through parent window
      const result = await sendMessageToPlugin({
        type: 'testConnection',
        filePath: filePath,
      });

      if (result.exists) {
        showStatus('File found and accessible', 'success');
        previewFile(filePath);
      } else {
        showStatus(`File not found: ${result.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('[Sync.md UI] Error testing connection:', error);
      showStatus('Error testing connection', 'error');
    }
  }

  // File browsing not available in web version - function removed

  async function previewFile(filePath) {
    try {
      const result = await sendMessageToPlugin({
        type: 'readFile',
        filePath: filePath,
      });

      if (result && result.content) {
        document.getElementById('preview').style.display = 'block';
        document.getElementById('previewContent').textContent = result.content;
      }
    } catch (error) {
      console.error('[Sync.md UI] Error previewing file:', error);
    }
  }

  function updateSyncInfo() {
    if (!currentConfig || !currentConfig.filePath || !currentConfig.projectId) {
      return;
    }

    // Update sync status display
    document.getElementById('syncStatus').textContent = 'Active';
    document.getElementById('lastSync').textContent = 'Just now';

    // Request actual sync info from plugin
    sendMessageToPlugin({ type: 'getSyncInfo' })
      .then((info) => {
        if (info) {
          document.getElementById('syncStatus').textContent = info.isWatching
            ? 'Active'
            : 'Inactive';
          document.getElementById('lastSync').textContent = info.lastSyncTime
            ? new Date(info.lastSyncTime).toLocaleString()
            : 'Never';
          document.getElementById('taskCount').textContent = info.taskCount || '0';
        }
      })
      .catch((error) => {
        console.error('[Sync.md UI] Error getting sync info:', error);
      });
  }

  function showStatus(message, type) {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
    statusEl.style.display = 'block';

    // Auto-hide after 5 seconds for success/info
    if (type !== 'error') {
      setTimeout(() => {
        statusEl.style.display = 'none';
      }, 5000);
    }
  }

  // Apply theme
  function applyTheme(theme) {
    if (theme === 'dark') {
      document.body.style.setProperty('--text-color', '#e0e0e0');
      document.body.style.setProperty('--text-secondary', '#999');
      document.body.style.setProperty('--background-color', '#1e1e1e');
      document.body.style.setProperty('--border-color', '#444');
      document.body.style.setProperty('--input-bg', '#2a2a2a');
      document.body.style.setProperty('--bg-secondary', '#2a2a2a');
      document.body.style.setProperty('--primary-color', '#42a5f5');
      document.body.style.setProperty('--primary-dark', '#1e88e5');
    }
  }

  // Helper function to send messages to plugin
  function sendMessageToPlugin(message) {
    return new Promise((resolve, reject) => {
      const messageId = Date.now() + Math.random();

      // Listen for response
      const handler = (event) => {
        if (
          event.data &&
          event.data.type === 'PLUGIN_MESSAGE_RESPONSE' &&
          event.data.messageId === messageId
        ) {
          window.removeEventListener('message', handler);
          if (event.data.error) {
            reject(new Error(event.data.error));
          } else {
            resolve(event.data.result);
          }
        }
      };

      window.addEventListener('message', handler);

      // Send message to plugin
      window.parent.postMessage(
        {
          type: 'PLUGIN_MESSAGE',
          messageId: messageId,
          data: message,
        },
        '*',
      );

      // Timeout after 10 seconds
      setTimeout(() => {
        window.removeEventListener('message', handler);
        reject(new Error('Message timeout'));
      }, 10000);
    });
  }

  // Start initialization
  waitForAPI();
})();
