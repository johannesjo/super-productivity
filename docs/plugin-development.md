# WARNING WIP (HELP WANTED)

These docs are a first draft and at many places plain wrong. I think the best way to figure out how to write a plugin is to check aut the example plugins:

https://github.com/johannesjo/super-productivity/tree/master/packages/plugin-dev/
https://github.com/johannesjo/super-productivity/tree/master/packages/plugin-dev/yesterday-tasks-plugin

It is not super complicated, I think :)

---

# Super Productivity Plugin Development Guide

This guide covers everything you need to know about creating plugins for Super Productivity.

## Table of Contents

- [Quick Start](#quick-start)
- [Plugin Manifest](#plugin-manifest)
- [Plugin Types](#plugin-types)
- [Available API Methods](#available-api-methods)
- [Best Practices](#best-practices)
- [Security Considerations](#security-considerations)
- [Testing Your Plugin](#testing-your-plugin)

## Quick Start

### 1. Use the Plugin Boilerplate or copy example plugin

https://github.com/johannesjo/super-productivity/tree/master/packages/plugin-dev/boilerplate-solid-js
https://github.com/johannesjo/super-productivity/tree/master/packages/plugin-dev/yesterday-tasks-plugin

### 2. Basic Plugin Structure

```
my-plugin/
├── manifest.json      # Plugin metadata (required)
├── plugin.js          # Main plugin code (optional)
├── index.html         # UI interface (optional)
└── icon.svg           # Plugin icon (optional)
```

### 3. Minimal Example

**manifest.json:**

```json
{
  "id": "hello-world",
  "name": "Hello World Plugin",
  "version": "1.0.0",
  "description": "My first Super Productivity plugin",
  "manifestVersion": 1,
  "minSupVersion": "8.0.0"
}
```

**plugin.js:**

```javascript
console.log('Hello World plugin loaded!');

// Show a notification
PluginAPI.showSnack({
  msg: 'Hello from my plugin!',
  type: 'SUCCESS',
});

// Register a header button
PluginAPI.registerHeaderButton({
  label: 'Hello',
  icon: 'waving_hand',
  onClick: () => {
    PluginAPI.showSnack({
      msg: 'Button clicked!',
      type: 'INFO',
    });
  },
});
```

## Plugin Manifest

The `manifest.json` file is required for all plugins and defines the plugin's metadata and configuration.

### Manifest Fields

| Field             | Type     | Required | Description                                                |
| ----------------- | -------- | -------- | ---------------------------------------------------------- |
| `id`              | string   | ✓        | Unique identifier for your plugin (use kebab-case)         |
| `name`            | string   | ✓        | Display name shown to users                                |
| `version`         | string   | ✓        | Semantic version (e.g., "1.0.0")                           |
| `description`     | string   | ✓        | Brief description of what your plugin does                 |
| `manifestVersion` | number   | ✓        | Currently must be `1`                                      |
| `minSupVersion`   | string   | ✓        | Minimum Super Productivity version required                |
| `author`          | string   |          | Plugin author name                                         |
| `homepage`        | string   |          | Plugin website or repository URL                           |
| `icon`            | string   |          | Path to icon file (SVG recommended)                        |
| `iFrame`          | boolean  |          | Whether plugin uses iframe UI (default: false)             |
| `sidePanel`       | boolean  |          | Show plugin in side panel (default: false)                 |
| `permissions`     | string[] |          | The permissions the plugin needs (e.g., ["nodeExecution"]) |
| `hooks`           | string[] |          | App events to listen to                                    |

### Complete Manifest Example

```json
{
  "id": "my-advanced-plugin",
  "name": "My Advanced Plugin",
  "version": "2.1.0",
  "description": "An advanced plugin with UI and hooks",
  "manifestVersion": 1,
  "minSupVersion": "8.0.0",
  "author": "John Doe",
  "homepage": "https://github.com/johndoe/my-plugin",
  "icon": "icon.svg",
  "iFrame": true,
  "sidePanel": false,
  "permissions": ["nodeExecution"],
  "hooks": ["taskComplete", "taskUpdate", "currentTaskChange"]
}
```

## Plugin Types

### 1. JavaScript Plugins (`plugin.js`)

Pure JavaScript plugins that run in a sandboxed environment with full API access.

**Use when:**

- You need to register UI components (buttons, menu items)
- You want to listen to app hooks/events
- You need programmatic interaction with tasks/projects

**Example:**

```javascript
// Register multiple UI elements
PluginAPI.registerHeaderButton({
  label: 'My Button',
  icon: 'star',
  onClick: async () => {
    const tasks = await PluginAPI.getTasks();
    console.log(`You have ${tasks.length} tasks`);
  },
});

PluginAPI.registerHook(PluginAPI.Hooks.TASK_COMPLETE, (taskId) => {
  console.log(`Task ${taskId} completed!`);
});
```

### 2. HTML/Iframe Plugins (`index.html`)

Plugins that render custom UI in a sandboxed iframe.

**Use when:**

- You need custom UI/visualizations
- You want to display charts, forms, or complex interfaces
- You prefer working with HTML/CSS

**Important:** When using iframes, you must inline all CSS and JavaScript directly in the HTML file. External stylesheets and scripts are blocked for security reasons.

**Example index.html:**

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>My Plugin UI</title>

    <!-- CSS must be inlined -->
    <style>
      body {
        font-family: Arial, sans-serif;
        padding: 20px;
        background: #f5f5f5;
      }

      .task-list {
        background: white;
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .task-item {
        padding: 8px;
        border-bottom: 1px solid #eee;
      }

      button {
        background: #4caf50;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 4px;
        cursor: pointer;
      }

      button:hover {
        background: #45a049;
      }
    </style>
  </head>
  <body>
    <h1>My Plugin</h1>
    <div id="content">
      <button id="loadTasks">Load Tasks</button>
      <div
        id="taskList"
        class="task-list"
      ></div>
    </div>

    <!-- JavaScript must be inlined -->
    <script>
      document.getElementById('loadTasks').addEventListener('click', async () => {
        try {
          const tasks = await PluginAPI.getTasks();
          const taskList = document.getElementById('taskList');

          taskList.innerHTML = '<h3>Your Tasks:</h3>';

          tasks.forEach((task) => {
            const taskEl = document.createElement('div');
            taskEl.className = 'task-item';
            taskEl.textContent = task.title;
            taskList.appendChild(taskEl);
          });

          PluginAPI.showSnack({
            msg: `Loaded ${tasks.length} tasks`,
            type: 'SUCCESS',
          });
        } catch (error) {
          console.error('Error loading tasks:', error);
          PluginAPI.showSnack({
            msg: 'Failed to load tasks',
            type: 'ERROR',
          });
        }
      });

      // Error handling
      window.addEventListener('error', (event) => {
        console.error('Plugin error:', event.error);
      });
    </script>
  </body>
</html>
```

### 3. Hybrid Plugins

Combine both `plugin.js` and `index.html` for maximum flexibility.

**plugin.js:**

```javascript
// Register UI elements and hooks
PluginAPI.registerSidePanelButton({
  label: 'Open My Plugin',
  icon: 'dashboard',
  onClick: () => {
    PluginAPI.showIndexHtmlAsView();
  },
});

// Listen for events and update iframe
PluginAPI.registerHook(PluginAPI.Hooks.TASK_UPDATE, () => {
  // Notify iframe about task update
  // (iframe will receive this via PluginAPI events)
});
```

## Available API Methods

### Data Operations

#### Tasks

- `getTasks()` - Get all active tasks
- `getArchivedTasks()` - Get archived tasks
- `getCurrentContextTasks()` - Get tasks in current context
- `addTask(task)` - Create a new task
- `updateTask(taskId, updates)` - Update existing task

#### Projects

- `getAllProjects()` - Get all projects
- `addProject(project)` - Create new project
- `updateProject(projectId, updates)` - Update project

#### Tags

- `getAllTags()` - Get all tags
- `addTag(tag)` - Create new tag
- `updateTag(tagId, updates)` - Update tag

### UI Operations

#### Notifications

```javascript
// Show snackbar notification
PluginAPI.showSnack({
  msg: 'Operation completed!',
  type: 'SUCCESS', // SUCCESS, ERROR, INFO, WARNING
  ico: 'check', // Optional Material icon
  actionStr: 'Undo', // Optional action button
  actionFn: () => console.log('Undo clicked'),
});

// System notification
PluginAPI.notify({
  title: 'Task Complete',
  body: 'Great job!',
  ico: 'done',
});
```

#### Dialogs

```javascript
// Open a dialog
const result = await PluginAPI.openDialog({
  title: 'Confirm Action',
  content: 'Are you sure?',
  okBtnLabel: 'Yes',
  cancelBtnLabel: 'No',
});
```

### Registration Methods (plugin.js only)

#### Header Button

```javascript
PluginAPI.registerHeaderButton({
  id: 'my-header-btn', // Optional unique ID
  label: 'Click Me',
  icon: 'star', // Material icon name
  onClick: () => {
    console.log('Header button clicked');
  },
});
```

#### Menu Entry

```javascript
PluginAPI.registerMenuEntry({
  label: 'My Plugin Action',
  icon: 'extension',
  onClick: () => {
    console.log('Menu item clicked');
  },
});
```

#### Side Panel Button

```javascript
PluginAPI.registerSidePanelButton({
  label: 'My Panel',
  icon: 'dashboard',
  onClick: () => {
    PluginAPI.showIndexHtmlAsView();
  },
});
```

#### Keyboard Shortcut

```javascript
PluginAPI.registerShortcut({
  keys: 'ctrl+shift+p',
  label: 'My Plugin Shortcut',
  action: () => {
    console.log('Shortcut triggered');
  },
});
```

#### Hooks

```javascript
// Available hooks
const hooks = {
  TASK_COMPLETE: 'taskComplete',
  TASK_UPDATE: 'taskUpdate',
  TASK_DELETE: 'taskDelete',
  CURRENT_TASK_CHANGE: 'currentTaskChange',
  FINISH_DAY: 'finishDay',
  LANGUAGE_CHANGE: 'languageChange',
  PERSISTED_DATA_UPDATE: 'persistedDataUpdate',
  ACTION: 'action',
};

// Register hook listener
PluginAPI.registerHook(PluginAPI.Hooks.TASK_COMPLETE, (taskId) => {
  console.log(`Task ${taskId} completed!`);
});

// Listen to Redux actions
PluginAPI.registerHook(PluginAPI.Hooks.ACTION, (action) => {
  if (action.type === 'ADD_TASK_SUCCESS') {
    console.log('New task added:', action.payload);
  }
});
```

### Data Persistence

```javascript
// Save plugin data
await PluginAPI.persistDataSynced('myKey', { count: 42 });

// Load saved data
const data = await PluginAPI.loadSyncedData('myKey');
console.log(data); // { count: 42 }
```

## Best Practices

### 1. Performance

- **Lazy load resources**: Don't load everything on plugin initialization
- **Debounce expensive operations**: Use throttling for frequent events
- **Clean up resources**: Remove event listeners when appropriate

### 2. Error Handling

Always wrap async operations in try-catch blocks:

```javascript
async function loadData() {
  try {
    const tasks = await PluginAPI.getTasks();
    // Process tasks
  } catch (error) {
    console.error('Failed to load tasks:', error);
    PluginAPI.showSnack({
      msg: 'Error loading tasks',
      type: 'ERROR',
    });
  }
}
```

### 3. User Experience

- **Provide feedback**: Show loading states and confirmations
- **Be non-intrusive**: Don't spam notifications
- **Follow the app's design**: Use Material icons and consistent styling
- **Respect user preferences**: Check dark mode, language settings

### 4. Security

- **Validate inputs**: Never trust user input
- **Avoid eval()**: Use safe JSON parsing instead
- **Sanitize HTML**: If displaying user content
- **Request minimal permissions**: Only what you need

### 5. Iframe Development

When developing iframe plugins:

1. **Inline everything**: CSS and JavaScript must be in the HTML file
2. **Wait for API ready**: Listen for the `PluginApiReady` event
3. **Handle errors gracefully**: Iframes can fail to load
4. **Keep it lightweight**: Iframes add overhead

```html
<!-- Good: Everything inlined -->
<!DOCTYPE html>
<html>
  <head>
    <style>
      /* All styles here */
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script>
      // All JavaScript here
    </script>
  </body>
</html>
```

## Security Considerations

### Sandboxing

- JavaScript plugins run in isolated VM contexts
- Iframe plugins run in sandboxed iframes with restricted permissions
- No access to Node.js APIs unless explicitly granted
- No access to file system or network unless through API

### API Restrictions

In iframe context, these methods are NOT available:

- `registerHeaderButton()`
- `registerMenuEntry()`
- `registerSidePanelButton()`
- `registerShortcut()`
- `registerHook()`
- `execNodeScript()`

### Content Security Policy

- External scripts/styles are blocked in iframes
- Only same-origin resources are allowed
- Inline scripts must be within the HTML file

## Testing Your Plugin

### 1. Local Development

1. Enable Developer Mode in Super Productivity settings
2. Use "Load Plugin from Folder" to test your plugin
3. Open DevTools (F12) to see console logs
4. Use the API Test Plugin as reference

### 2. Debugging Tips

```javascript
// Add debug logging
const DEBUG = true;

function log(...args) {
  if (DEBUG) {
    console.log('[MyPlugin]', ...args);
  }
}

// Test API methods
async function testAPI() {
  log('Testing getTasks...');
  const tasks = await PluginAPI.getTasks();
  log('Tasks:', tasks);

  log('Testing showSnack...');
  PluginAPI.showSnack({
    msg: 'API test successful!',
    type: 'SUCCESS',
  });
}
```

### 3. Common Issues

**Plugin not loading:**

- Check manifest.json syntax
- Verify minSupVersion compatibility
- Look for errors in console

**API methods failing:**

- Ensure PluginAPI is ready before use
- Check if method is available in current context
- Verify permissions in manifest

**Iframe not displaying:**

- Check that all resources are inlined
- Verify no external dependencies
- Look for CSP violations in console

## Examples

### Task Reporter Plugin

```javascript
// plugin.js
let reportInterval;

PluginAPI.registerHeaderButton({
  label: 'Start Report',
  icon: 'assessment',
  onClick: () => {
    if (reportInterval) {
      clearInterval(reportInterval);
      reportInterval = null;
      PluginAPI.showSnack({ msg: 'Reporting stopped', type: 'INFO' });
    } else {
      reportInterval = setInterval(generateReport, 3600000); // Every hour
      PluginAPI.showSnack({ msg: 'Reporting started', type: 'SUCCESS' });
    }
  },
});

async function generateReport() {
  const tasks = await PluginAPI.getCurrentContextTasks();
  const completed = tasks.filter((t) => t.isDone).length;
  const total = tasks.length;

  PluginAPI.notify({
    title: 'Hourly Report',
    body: `Completed ${completed} of ${total} tasks`,
    ico: 'pie_chart',
  });
}
```

### Custom Dashboard Plugin

```html
<!-- index.html -->
<!DOCTYPE html>
<html>
  <head>
    <style>
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 20px;
        background: #f0f0f0;
      }

      .dashboard {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
      }

      .stat-card {
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        text-align: center;
      }

      .stat-value {
        font-size: 36px;
        font-weight: bold;
        color: #2196f3;
      }

      .stat-label {
        color: #666;
        margin-top: 8px;
      }
    </style>
  </head>
  <body>
    <h1>Task Dashboard</h1>
    <div
      class="dashboard"
      id="dashboard"
    >
      <div class="stat-card">
        <div
          class="stat-value"
          id="totalTasks"
        >
          -
        </div>
        <div class="stat-label">Total Tasks</div>
      </div>
      <div class="stat-card">
        <div
          class="stat-value"
          id="completedTasks"
        >
          -
        </div>
        <div class="stat-label">Completed</div>
      </div>
      <div class="stat-card">
        <div
          class="stat-value"
          id="totalProjects"
        >
          -
        </div>
        <div class="stat-label">Projects</div>
      </div>
      <div class="stat-card">
        <div
          class="stat-value"
          id="totalTags"
        >
          -
        </div>
        <div class="stat-label">Tags</div>
      </div>
    </div>

    <script>
      window.addEventListener('PluginApiReady', async () => {
        async function updateDashboard() {
          try {
            const [tasks, projects, tags] = await Promise.all([
              PluginAPI.getTasks(),
              PluginAPI.getAllProjects(),
              PluginAPI.getAllTags(),
            ]);

            document.getElementById('totalTasks').textContent = tasks.length;
            document.getElementById('completedTasks').textContent = tasks.filter(
              (t) => t.isDone,
            ).length;
            document.getElementById('totalProjects').textContent = projects.length;
            document.getElementById('totalTags').textContent = tags.length;
          } catch (error) {
            console.error('Dashboard update failed:', error);
          }
        }

        // Initial load
        updateDashboard();

        // Refresh every 30 seconds
        setInterval(updateDashboard, 30000);
      });
    </script>
  </body>
</html>
```

## Resources

- **Plugin API Types**: [@super-productivity/plugin-api](https://www.npmjs.com/package/@super-productivity/plugin-api)
- **Plugin Boilerplate**: [GitHub Repository](https://github.com/johannesjo/super-productivity-plugin-boilerplate)
- **Example Plugins**: Check the `src/app/features/plugin/plugins` directory
- **Community Plugins**: [Awesome Super Productivity](https://github.com/johannesjo/super-productivity#plugins)

## Contributing

If you create a useful plugin, consider:

1. Publishing it to npm
2. Submitting a PR to add it to the community plugins list
3. Sharing it in the Super Productivity discussions

Happy plugin development! 🚀
