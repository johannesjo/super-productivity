// API Test Plugin - Comprehensive test of all plugin API methods
console.log('API Test Plugin initializing...', PluginAPI);

// Helper function to log results
function logResult(method, result, error = null) {
  if (error) {
    console.error(`API Test - ${method} failed:`, error);
    PluginAPI.showSnack({
      msg: `${method} failed: ${error.message}`,
      type: 'ERROR',
    });
  } else {
    console.log(`API Test - ${method} success:`, result);
  }
}

// Test data persistence
async function testDataPersistence() {
  console.log('=== Testing Data Persistence ===');

  try {
    // Save some test data
    const testData = {
      timestamp: new Date().toISOString(),
      counter: Math.floor(Math.random() * 100),
      message: 'Hello from API Test Plugin!',
    };

    await PluginAPI.persistDataSynced(JSON.stringify(testData));
    logResult('persistDataSynced', 'Data saved successfully');

    // Load it back
    const loadedData = await PluginAPI.loadSyncedData();
    const parsed = loadedData ? JSON.parse(loadedData) : null;
    logResult('loadSyncedData', parsed);

    PluginAPI.showSnack({
      msg: 'Data persistence test passed',
      type: 'SUCCESS',
    });
  } catch (error) {
    logResult('Data Persistence', null, error);
  }
}

// Test task operations
async function testTaskOperations() {
  console.log('=== Testing Task Operations ===');

  try {
    // Get all tasks
    const allTasks = await PluginAPI.getTasks();
    logResult('getTasks', `Found ${allTasks.length} tasks`);

    // Get archived tasks
    const archivedTasks = await PluginAPI.getArchivedTasks();
    logResult('getArchivedTasks', `Found ${archivedTasks.length} archived tasks`);

    // Get current context tasks
    const contextTasks = await PluginAPI.getCurrentContextTasks();
    logResult('getCurrentContextTasks', `Found ${contextTasks.length} context tasks`);

    // Create a test task
    const newTaskId = await PluginAPI.addTask({
      title: 'API Test Task - ' + new Date().toLocaleTimeString(),
      notes: 'This task was created by the API Test Plugin to test the addTask method',
      timeEstimate: 1800000, // 30 minutes in milliseconds
    });
    logResult('addTask', `Created task with ID: ${newTaskId}`);

    // Update the task
    if (newTaskId) {
      await PluginAPI.updateTask(newTaskId, {
        notes: 'Updated: This task was modified by the API Test Plugin',
        timeEstimate: 3600000, // 1 hour
      });
      logResult('updateTask', 'Task updated successfully');
    }

    PluginAPI.showSnack({
      msg: 'Task operations test completed',
      type: 'SUCCESS',
    });
  } catch (error) {
    logResult('Task Operations', null, error);
  }
}

// Test project operations
async function testProjectOperations() {
  console.log('=== Testing Project Operations ===');

  try {
    // Get all projects
    const projects = await PluginAPI.getAllProjects();
    logResult('getAllProjects', `Found ${projects.length} projects`);

    // Create a test project
    const newProject = await PluginAPI.addProject({
      title: 'API Test Project - ' + new Date().toLocaleDateString(),
      themeColor: '#' + Math.floor(Math.random() * 16777215).toString(16), // Random color
    });
    logResult('addProject', `Created project: ${newProject.title}`);

    // Update the project
    if (newProject && newProject.id) {
      await PluginAPI.updateProject(newProject.id, {
        title: newProject.title + ' (Updated)',
      });
      logResult('updateProject', 'Project updated successfully');
    }

    PluginAPI.showSnack({
      msg: 'Project operations test completed',
      type: 'SUCCESS',
    });
  } catch (error) {
    logResult('Project Operations', null, error);
  }
}

// Test tag operations
async function testTagOperations() {
  console.log('=== Testing Tag Operations ===');

  try {
    // Get all tags
    const tags = await PluginAPI.getAllTags();
    logResult('getAllTags', `Found ${tags.length} tags`);

    // Create a test tag
    const newTag = await PluginAPI.addTag({
      title: 'API Test Tag - ' + Date.now(),
      color: '#' + Math.floor(Math.random() * 16777215).toString(16), // Random color
    });
    logResult('addTag', `Created tag: ${newTag.title}`);

    // Update the tag
    if (newTag && newTag.id) {
      await PluginAPI.updateTag(newTag.id, {
        title: newTag.title + ' (Updated)',
      });
      logResult('updateTag', 'Tag updated successfully');
    }

    PluginAPI.showSnack({
      msg: 'Tag operations test completed',
      type: 'SUCCESS',
    });
  } catch (error) {
    logResult('Tag Operations', null, error);
  }
}

// Test UI methods
function testUIOperations() {
  console.log('=== Testing UI Operations ===');

  // Test different snack types
  const snackTypes = ['SUCCESS', 'ERROR', 'CUSTOM'];
  let snackIndex = 0;

  const showNextSnack = () => {
    if (snackIndex < snackTypes.length) {
      const type = snackTypes[snackIndex];
      PluginAPI.showSnack({
        msg: `Test ${type} snack message`,
        type: type,
        ico: type === 'SUCCESS' ? 'check' : type === 'ERROR' ? 'error' : 'info',
      });
      snackIndex++;
      setTimeout(showNextSnack, 1500);
    }
  };

  showNextSnack();

  // Test notification
  setTimeout(() => {
    PluginAPI.notify({
      title: 'API Test Plugin',
      body: 'This is a test notification from the API Test Plugin',
    });
    logResult('notify', 'Notification sent');
  }, 5000);

  // Test basic dialog
  setTimeout(() => {
    PluginAPI.openDialog({
      title: 'Basic Dialog Example',
      htmlContent: `
        <div style="padding: 20px;">
          <h3>API Test Results</h3>
          <p>Check the console for detailed test results.</p>
          <p>This dialog demonstrates the openDialog API method.</p>
        </div>
      `,
      buttons: [
        {
          label: 'Run All Tests',
          icon: 'play_arrow',
          color: 'primary',
          onClick: runAllTests,
        },
        {
          label: 'Close',
          icon: 'close',
          color: 'warn',
        },
      ],
    });
    logResult('openDialog', 'Basic dialog opened');
  }, 2000);
}

// Register hooks to test them
PluginAPI.registerHook(PluginAPI.Hooks.TASK_COMPLETE, (taskData) => {
  console.log('API Test - TASK_COMPLETE hook fired:', taskData);
});

PluginAPI.registerHook(PluginAPI.Hooks.TASK_UPDATE, (taskData) => {
  console.log('API Test - TASK_UPDATE hook fired:', taskData);
});

PluginAPI.registerHook(PluginAPI.Hooks.TASK_DELETE, (taskData) => {
  console.log('API Test - TASK_DELETE hook fired:', taskData);
});

PluginAPI.registerHook(PluginAPI.Hooks.CURRENT_TASK_CHANGE, (taskData) => {
  console.log('API Test - CURRENT_TASK_CHANGE hook fired:', taskData);
});

// Register UI elements
PluginAPI.registerHeaderButton({
  label: 'Run API Tests',
  icon: 'play_arrow',
  onClick: runAllTests,
});

PluginAPI.registerMenuEntry({
  label: 'API Test Dashboard',
  icon: 'dashboard',
  onClick: () => {
    PluginAPI.showIndexHtmlAsView();
  },
});

PluginAPI.registerShortcut({
  id: 'run_api_tests',
  label: 'Run All API Tests',
  onExec: runAllTests,
});

// Main test runner
async function runAllTests() {
  PluginAPI.showSnack({
    msg: 'Running all API tests...',
    type: 'CUSTOM',
    ico: 'play_arrow',
  });

  console.log('========================================');
  console.log('Starting API Test Plugin Test Suite');
  console.log('========================================');

  // Run tests sequentially
  await testDataPersistence();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await testTaskOperations();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await testProjectOperations();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await testTagOperations();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  testUIOperations();

  console.log('========================================');
  console.log('API Test Suite Completed');
  console.log('========================================');
}

// More sophisticated dialog examples
async function testAdvancedDialogs() {
  console.log('=== Testing Advanced Dialogs ===');

  // Form-like dialog
  await PluginAPI.openDialog({
    title: 'Advanced Form Dialog',
    htmlContent: `
      <div style="padding: 20px; max-width: 500px;">
        <h3>Task Creation Form</h3>
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">Task Title:</label>
          <input id="taskTitle" type="text" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;" placeholder="Enter task title">
        </div>
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">Description:</label>
          <textarea id="taskDesc" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; min-height: 80px;" placeholder="Enter task description"></textarea>
        </div>
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">Priority:</label>
          <select id="taskPriority" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
            <option value="low">Low</option>
            <option value="medium" selected>Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px;">
            <input id="taskUrgent" type="checkbox"> Mark as urgent
          </label>
        </div>
      </div>
    `,
    buttons: [
      {
        label: 'Create Task',
        icon: 'add_task',
        color: 'primary',
        onClick: async () => {
          // In a real plugin, you would read the form values here
          console.log('Form submitted - would create task');
          await PluginAPI.showSnack({
            msg: 'Task would be created (demo)',
            type: 'SUCCESS',
          });
        },
      },
      {
        label: 'Cancel',
        icon: 'cancel',
      },
    ],
  });

  // Progress dialog
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await PluginAPI.openDialog({
    title: 'Progress Dialog Example',
    htmlContent: `
      <div style="padding: 20px; text-align: center;">
        <h3>Processing Tasks</h3>
        <div style="margin: 20px 0;">
          <div style="width: 100%; background: #e0e0e0; border-radius: 10px; overflow: hidden;">
            <div style="width: 75%; background: #4caf50; height: 20px; transition: width 0.3s;"></div>
          </div>
          <p style="margin-top: 10px;">75% Complete</p>
        </div>
        <p>Processing task 75 of 100...</p>
      </div>
    `,
    buttons: [
      {
        label: 'Continue in Background',
        icon: 'play_arrow',
        color: 'primary',
      },
      {
        label: 'Cancel',
        icon: 'stop',
        color: 'warn',
      },
    ],
  });

  // Rich content dialog
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await PluginAPI.openDialog({
    title: 'Rich Content Dialog',
    htmlContent: `
      <div style="padding: 20px;">
        <h3>Task Statistics</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;">
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #4caf50;">42</div>
            <div style="color: #666;">Tasks Completed</div>
          </div>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #ff9800;">8</div>
            <div style="color: #666;">Tasks Pending</div>
          </div>
        </div>
        <h4>Recent Activity</h4>
        <ul style="list-style: none; padding: 0;">
          <li style="padding: 8px 0; border-bottom: 1px solid #eee;">✅ Completed "Update documentation"</li>
          <li style="padding: 8px 0; border-bottom: 1px solid #eee;">🔄 Started "Review pull requests"</li>
          <li style="padding: 8px 0; border-bottom: 1px solid #eee;">📝 Created "Plan next sprint"</li>
        </ul>
      </div>
    `,
    buttons: [
      {
        label: 'View Details',
        icon: 'visibility',
        color: 'primary',
        onClick: async () => {
          console.log('View details clicked');
          await PluginAPI.showSnack({
            msg: 'Opening detailed view...',
            type: 'CUSTOM',
            ico: 'visibility',
          });
        },
      },
      {
        label: 'Export',
        icon: 'download',
        onClick: async () => {
          console.log('Export clicked');
          await PluginAPI.showSnack({
            msg: 'Exporting statistics...',
            type: 'CUSTOM',
            ico: 'download',
          });
        },
      },
      {
        label: 'Close',
        icon: 'close',
      },
    ],
  });

  console.log('Advanced dialog tests completed');
}

// Register menu entries for dialog examples
PluginAPI.registerMenuEntry({
  label: 'Advanced Dialog Examples',
  icon: 'web_stories',
  onClick: testAdvancedDialogs,
});

// Show initialization message
setTimeout(() => {
  PluginAPI.showSnack({
    msg: 'API Test Plugin ready! Use header button to run tests.',
    type: 'SUCCESS',
    ico: 'check',
  });
}, 500);
