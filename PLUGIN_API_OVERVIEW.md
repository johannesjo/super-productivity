# Super Productivity Plugin API Overview

This document provides a comprehensive overview of the Super Productivity plugin system, its architecture, and API.

## Table of Contents

1. [Plugin Architecture](#plugin-architecture)
2. [Plugin Types](#plugin-types)
3. [Plugin API Reference](#plugin-api-reference)
4. [Security Model](#security-model)
5. [Plugin Development](#plugin-development)
6. [Examples](#examples)

## Plugin Architecture

Super Productivity uses a sophisticated plugin system that allows extending the application's functionality through custom plugins. The architecture consists of several key components:

### Core Components

- **PluginService** (`/src/app/plugins/plugin.service.ts`): Main orchestrator for plugin lifecycle
- **PluginBridgeService** (`/src/app/plugins/plugin-bridge.service.ts`): Communication bridge between plugins and the app
- **PluginAPI** (`/src/app/plugins/plugin-api.ts`): API interface exposed to plugins
- **PluginRunner** (`/src/app/plugins/plugin-runner.ts`): Executes plugin code in sandboxed environments

### Plugin Loading Process

1. **Discovery**: Built-in plugins from `/assets/` and uploaded plugins from cache
2. **Validation**: Manifest validation and permission checking
3. **Sandboxing**: Code execution in isolated JavaScript environments
4. **Registration**: UI components and hooks registration
5. **Initialization**: Plugin startup and configuration loading

## Plugin Types

### 1. JavaScript Plugins (plugin.js)

Traditional plugins that run JavaScript code in a sandboxed environment.

```javascript
// Example plugin.js
class MyPlugin {
  constructor() {
    this.config = {};
  }

  async init() {
    // Register UI components
    PluginAPI.registerHeaderButton({
      label: 'My Plugin',
      icon: 'extension',
      onClick: () => this.showDialog(),
    });

    // Register hooks
    PluginAPI.registerHook('taskCreated', (task) => {
      console.log('New task created:', task.title);
    });
  }

  showDialog() {
    PluginAPI.openDialog({
      title: 'My Plugin Dialog',
      message: 'Hello from my plugin!',
    });
  }
}

// Initialize plugin
const plugin = new MyPlugin();
plugin.init();
```

### 2. Iframe Plugins (index.html)

Plugins that render HTML interfaces in sandboxed iframes.

```html
<!-- index.html -->
<!DOCTYPE html>
<html>
  <head>
    <title>My Plugin UI</title>
  </head>
  <body>
    <h1>My Plugin Interface</h1>
    <button onclick="createTask()">Create Task</button>

    <script>
      async function createTask() {
        await window.PluginAPI.addTask({
          title: 'Task from plugin',
          projectId: null,
        });
      }
    </script>
  </body>
</html>
```

### 3. Hybrid Plugins

Plugins that combine both JavaScript execution and iframe interfaces.

## Plugin API Reference

### Core Methods

#### Data Operations

- `getTasks()` - Retrieve all tasks
- `getTaskById(id)` - Get specific task
- `addTask(task)` - Create new task
- `updateTask(id, changes)` - Update existing task
- `removeTask(id)` - Delete task

#### Project Operations

- `getProjects()` - Get all projects
- `getActiveProject()` - Get currently active project
- `addProject(project)` - Create new project

#### Data Persistence

- `persistDataSynced(data)` - Save plugin data with sync
- `loadPersistedData()` - Load saved plugin data

#### UI Operations

- `showSnack(config)` - Show notification snackbar
- `notify(config)` - Show system notification
- `openDialog(config)` - Display modal dialog

#### Navigation

- `showIndexHtmlAsView()` - Show plugin iframe in full view
- `showIndexHtmlInSidePanel()` - Show plugin iframe in side panel

### UI Registration Methods (plugin.js only)

These methods are restricted to main plugin code for security:

#### Header Buttons

```javascript
PluginAPI.registerHeaderButton({
  label: 'My Button',
  icon: 'extension',
  onClick: () => {
    // Button click handler
  },
});
```

#### Menu Entries

```javascript
PluginAPI.registerMenuEntry({
  label: 'My Plugin',
  icon: 'extension',
  onClick: () => {
    // Menu item click handler
  },
});
```

#### Side Panel Buttons

```javascript
PluginAPI.registerSidePanelButton({
  label: 'My Panel',
  icon: 'extension',
  onClick: () => {
    PluginAPI.showIndexHtmlInSidePanel();
  },
});
```

#### Keyboard Shortcuts

```javascript
PluginAPI.registerShortcut({
  keys: 'ctrl+alt+m',
  description: 'My Plugin Shortcut',
  callback: () => {
    // Shortcut handler
  },
});
```

### Hook System

Plugins can register hooks to respond to application events:

```javascript
PluginAPI.registerHook('taskCreated', (task) => {
  // React to task creation
});

PluginAPI.registerHook('taskUpdated', (task, changes) => {
  // React to task updates
});

PluginAPI.registerHook('beforeTaskDelete', (taskId) => {
  // React before task deletion
});
```

## Security Model

The plugin system implements a multi-layered security model:

### 1. Code Sandboxing

- JavaScript plugins run in isolated VM contexts
- Limited access to Node.js APIs (desktop app only)
- No direct file system access without permissions

### 2. Iframe Sandboxing

- HTML content runs in sandboxed iframes
- Standard iframe restrictions apply
- Communication only via postMessage

### 3. API Access Control

Certain methods are restricted based on context:

#### Restricted in Iframe Context

- `registerHeaderButton`
- `registerMenuEntry`
- `registerSidePanelButton`
- `registerShortcut`
- `registerHook`
- `executeNodeScript`
- `onMessage`

#### Available in Iframe Context

- All data operations (getTasks, addTask, etc.)
- UI operations (showSnack, notify, openDialog)
- Data persistence (persistDataSynced, loadPersistedData)

### 4. Permission System

Plugins can request specific permissions in their manifest:

```json
{
  "permissions": ["nodeExecution", "fileSystem", "network"]
}
```

## Plugin Development

### Manifest Structure

Every plugin requires a `manifest.json` file:

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "A sample plugin",
  "author": "Developer Name",
  "hooks": ["taskCreated", "taskUpdated"],
  "permissions": ["nodeExecution"],
  "iFrame": true,
  "isSkipMenuEntry": false,
  "minSupVersion": "8.0.0"
}
```

### Plugin Structure

```
my-plugin/
├── manifest.json       # Plugin metadata
├── plugin.js          # Main plugin code (optional)
├── index.html         # UI interface (optional)
├── iframe-script.js   # Iframe-specific code (optional)
└── icon.svg           # Plugin icon (optional)
```

### Development Workflow

1. **Create Manifest**: Define plugin metadata and requirements
2. **Implement Logic**: Write plugin.js for core functionality
3. **Create UI**: Design index.html for user interface
4. **Test Integration**: Use development tools to test plugin
5. **Package**: Create ZIP file for distribution

### Best Practices

1. **Error Handling**: Always wrap API calls in try-catch blocks
2. **Async Operations**: Use async/await for all API calls
3. **Resource Cleanup**: Properly clean up timers and listeners
4. **User Feedback**: Provide clear feedback for user actions
5. **Performance**: Minimize impact on app performance

## Examples

### 1. Task Counter Plugin

```javascript
// plugin.js
class TaskCounterPlugin {
  constructor() {
    this.taskCount = 0;
  }

  async init() {
    // Register UI
    PluginAPI.registerHeaderButton({
      label: `Tasks: ${this.taskCount}`,
      icon: 'assignment',
      onClick: () => this.showDetails(),
    });

    // Listen for task changes
    PluginAPI.registerHook('taskCreated', () => this.updateCount());
    PluginAPI.registerHook('taskDeleted', () => this.updateCount());

    // Initial count
    await this.updateCount();
  }

  async updateCount() {
    const tasks = await PluginAPI.getTasks();
    this.taskCount = tasks.length;
    // Update button label...
  }

  showDetails() {
    PluginAPI.openDialog({
      title: 'Task Statistics',
      message: `Total tasks: ${this.taskCount}`,
    });
  }
}

new TaskCounterPlugin().init();
```

### 2. Quick Note Plugin (Iframe)

```html
<!-- index.html -->
<!DOCTYPE html>
<html>
  <head>
    <title>Quick Notes</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        padding: 20px;
      }
      textarea {
        width: 100%;
        height: 200px;
        margin: 10px 0;
      }
      button {
        padding: 10px 20px;
        margin: 5px;
      }
    </style>
  </head>
  <body>
    <h2>Quick Notes</h2>
    <textarea
      id="noteText"
      placeholder="Enter your note..."
    ></textarea>
    <br />
    <button onclick="saveNote()">Save as Task</button>
    <button onclick="clearNote()">Clear</button>

    <script>
      async function saveNote() {
        const text = document.getElementById('noteText').value;
        if (!text.trim()) return;

        try {
          await window.PluginAPI.addTask({
            title: text,
            projectId: null,
          });

          window.PluginAPI.showSnack({
            message: 'Note saved as task!',
            type: 'SUCCESS',
          });

          clearNote();
        } catch (error) {
          window.PluginAPI.showSnack({
            message: 'Failed to save note',
            type: 'ERROR',
          });
        }
      }

      function clearNote() {
        document.getElementById('noteText').value = '';
      }
    </script>
  </body>
</html>
```

### 3. Sync Plugin (Hybrid)

Combines both plugin.js for logic and index.html for configuration:

```javascript
// plugin.js
class SyncPlugin {
  constructor() {
    this.config = null;
  }

  async init() {
    this.config = await this.loadConfig();

    PluginAPI.registerSidePanelButton({
      label: 'Sync Settings',
      icon: 'sync',
      onClick: () => PluginAPI.showIndexHtmlInSidePanel(),
    });

    // Start sync if configured
    if (this.config && this.config.enabled) {
      this.startSync();
    }
  }

  async loadConfig() {
    const data = await PluginAPI.loadPersistedData();
    return data ? JSON.parse(data) : null;
  }

  async saveConfig(config) {
    await PluginAPI.persistDataSynced(JSON.stringify(config));
    this.config = config;
  }

  startSync() {
    // Implement sync logic
  }
}

new SyncPlugin().init();
```

## Troubleshooting

### Common Issues

1. **Plugin Not Loading**: Check manifest.json syntax and required fields
2. **API Calls Failing**: Ensure proper async/await usage and error handling
3. **UI Not Registering**: Verify registerUi methods are called from plugin.js, not iframe
4. **Permission Errors**: Check if plugin has required permissions in manifest

### Development Tools

- Use browser DevTools for iframe debugging
- Check plugin service logs for loading issues
- Use the plugin management UI to reload plugins during development

### Getting Help

- Check existing plugin examples in `/assets/` directory
- Review plugin service source code for API implementation details
- Test with minimal plugin examples before adding complexity

---

This overview provides the foundation for understanding and developing plugins for Super Productivity. For the most up-to-date API reference, always refer to the source code and existing plugin examples.
