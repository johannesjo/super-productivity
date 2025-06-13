// Markdown List to Task Plugin
// Converts markdown lists to tasks with support for nested lists

console.log('Markdown List to Task Plugin initializing...');

let hasDeepNesting = false;

function parseMarkdownList(text) {
  const lines = text.split('\n');
  const tasks = [];
  const stack = [];
  hasDeepNesting = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const match = line.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
    if (!match) continue;

    const [, indent, bullet, content] = match;
    const level = Math.floor(indent.length / 2);

    if (level > 1) {
      hasDeepNesting = true;
      continue;
    }

    const task = {
      title: content.trim(),
      subTasks: [],
      deepNotes: [],
    };

    if (level === 0) {
      tasks.push(task);
      stack[0] = task;
      stack.length = 1;
    } else if (level === 1 && stack[0]) {
      stack[0].subTasks.push(task);
      stack[1] = task;
      stack.length = 2;
    }
  }

  if (hasDeepNesting) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const match = line.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
      if (!match) continue;

      const [, indent, bullet, content] = match;
      const level = Math.floor(indent.length / 2);

      if (level > 1) {
        const parentLevel = level - 2;
        const parentTask = parentLevel === 0 ? stack[0] : stack[1];
        if (parentTask) {
          const checklistIndent = '  '.repeat(level - 2);
          parentTask.deepNotes.push(`${checklistIndent}- [ ] ${content.trim()}`);
        }
      }
    }
  }

  return tasks;
}

function createTasksFromParsedData(tasks) {
  const createdTasks = [];

  tasks.forEach((taskData) => {
    const taskConfig = {
      title: taskData.title,
      subTasks: [],
    };

    if (taskData.deepNotes.length > 0) {
      taskConfig.notes = taskData.deepNotes.join('\n');
    }

    if (taskData.subTasks.length > 0) {
      taskData.subTasks.forEach((subTask) => {
        const subTaskConfig = {
          title: subTask.title,
        };
        if (subTask.deepNotes.length > 0) {
          subTaskConfig.notes = subTask.deepNotes.join('\n');
        }
        taskConfig.subTasks.push(subTaskConfig);
      });
    }

    createdTasks.push(taskConfig);
  });

  return createdTasks;
}

async function convertMarkdownToTasks(text) {
  try {
    const parsedTasks = parseMarkdownList(text);

    if (parsedTasks.length === 0) {
      PluginAPI.showSnack({
        msg: 'No valid markdown list items found',
        type: 'ERROR',
      });
      return;
    }

    const tasksToCreate = createTasksFromParsedData(parsedTasks);
    let createdCount = 0;

    for (const taskConfig of tasksToCreate) {
      await PluginAPI.addTask(taskConfig);
      createdCount++;
    }

    if (hasDeepNesting) {
      PluginAPI.showSnack({
        msg: `Created ${createdCount} tasks. Warning: Items nested deeper than 2 levels were added as notes.`,
        type: 'CUSTOM',
      });
    } else {
      PluginAPI.showSnack({
        msg: `Successfully created ${createdCount} tasks`,
        type: 'SUCCESS',
      });
    }
  } catch (error) {
    PluginAPI.showSnack({
      msg: 'Error creating tasks: ' + error.message,
      type: 'ERROR',
    });
  }
}

// Store conversion function for iframe access
PluginAPI.persistDataSynced('convertMarkdownToTasks', convertMarkdownToTasks);

// Register keyboard shortcut for clipboard conversion
PluginAPI.registerShortcut({
  id: 'convert-clipboard-markdown',
  label: 'Convert clipboard markdown to tasks',
  onExec: async function () {
    // Direct the user to the plugin's UI for pasting content
    PluginAPI.showIndexHtmlAsView();
    PluginAPI.showSnack({
      msg: 'Please paste your markdown list in the plugin interface',
      type: 'CUSTOM',
    });
  },
});

console.log('Markdown List to Task Plugin initialized successfully!');
