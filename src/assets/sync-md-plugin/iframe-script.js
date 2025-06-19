// Iframe communication script for Sync.md plugin UI

(function () {
  let pluginBridge = null;
  let currentConfig = null;

  // Wait for plugin bridge to be available
  function waitForBridge() {
    if (window.pluginBridge) {
      pluginBridge = window.pluginBridge;
      initialize();
    } else {
      setTimeout(waitForBridge, 100);
    }
  }

  async function initialize() {
    console.log('[Sync.md UI] Initializing...');

    // Load projects
    await loadProjects();

    // Load saved configuration
    await loadConfig();

    // Setup event listeners
    setupEventListeners();

    // Update UI state
    updateSyncInfo();
  }

  async function loadProjects() {
    try {
      const projects = await pluginBridge.getProjects();
      const select = document.getElementById('projectId');

      // Clear existing options
      select.innerHTML = '<option value="">Select a project...</option>';

      // Add project options
      projects.forEach((project) => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = project.title;
        select.appendChild(option);
      });
    } catch (error) {
      console.error('[Sync.md UI] Error loading projects:', error);
      showStatus('Error loading projects', 'error');
    }
  }

  async function loadConfig() {
    try {
      const config = await pluginBridge.getUserData('syncMdConfig');
      if (config) {
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

    // Browse button
    document.getElementById('browseBtn').addEventListener('click', browseForFile);

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
      await pluginBridge.setUserData('syncMdConfig', config);

      // Notify plugin to restart watching
      await pluginBridge.sendMessage({
        type: 'configUpdated',
        config: config,
      });

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

      const result = await pluginBridge.sendMessage({
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

  async function browseForFile() {
    try {
      // Request file selection through plugin bridge
      const result = await pluginBridge.sendMessage({
        type: 'browseFile',
        filters: [
          { name: 'Markdown files', extensions: ['md', 'markdown'] },
          { name: 'All files', extensions: ['*'] },
        ],
      });

      if (result.filePath) {
        document.getElementById('filePath').value = result.filePath;
        previewFile(result.filePath);
      }
    } catch (error) {
      console.error('[Sync.md UI] Error browsing for file:', error);
      showStatus('File browsing not available', 'error');
    }
  }

  async function previewFile(filePath) {
    try {
      const result = await pluginBridge.sendMessage({
        type: 'readFile',
        filePath: filePath,
      });

      if (result.content) {
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
    pluginBridge
      .sendMessage({ type: 'getSyncInfo' })
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

  // Listen for theme changes
  if (window.pluginBridge?.onThemeChange) {
    window.pluginBridge.onThemeChange((theme) => {
      applyTheme(theme);
    });
  }

  // Start initialization
  waitForBridge();
})();
