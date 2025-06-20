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

// Even more sophisticated dialog examples
async function testComplexDialogs() {
  console.log('=== Testing Complex Dialogs ===');

  // Multi-step wizard dialog
  await PluginAPI.openDialog({
    title: 'Project Setup Wizard',
    htmlContent: `
      <div style="padding: 20px; max-width: 600px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
          <div style="text-align: center; flex: 1;">
            <div style="width: 40px; height: 40px; border-radius: 50%; background: #4caf50; color: white; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px;">1</div>
            <small style="color: #4caf50; font-weight: bold;">Basic Info</small>
          </div>
          <div style="flex: 1; display: flex; align-items: center;">
            <div style="height: 2px; background: #e0e0e0; width: 100%;"></div>
          </div>
          <div style="text-align: center; flex: 1;">
            <div style="width: 40px; height: 40px; border-radius: 50%; background: #e0e0e0; color: #999; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px;">2</div>
            <small style="color: #999;">Settings</small>
          </div>
          <div style="flex: 1; display: flex; align-items: center;">
            <div style="height: 2px; background: #e0e0e0; width: 100%;"></div>
          </div>
          <div style="text-align: center; flex: 1;">
            <div style="width: 40px; height: 40px; border-radius: 50%; background: #e0e0e0; color: #999; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px;">3</div>
            <small style="color: #999;">Review</small>
          </div>
        </div>
        
        <h3>Step 1: Basic Information</h3>
        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">Project Name:</label>
          <input type="text" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;" placeholder="My Awesome Project" value="Super Productivity Enhancement">
        </div>
        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">Project Type:</label>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
            <label style="padding: 15px; border: 2px solid #4caf50; border-radius: 8px; text-align: center; cursor: pointer; background: #f1f8f4;">
              <input type="radio" name="projectType" value="personal" checked style="margin-right: 5px;">
              <div>📝 Personal</div>
            </label>
            <label style="padding: 15px; border: 2px solid #ddd; border-radius: 8px; text-align: center; cursor: pointer;">
              <input type="radio" name="projectType" value="work" style="margin-right: 5px;">
              <div>💼 Work</div>
            </label>
            <label style="padding: 15px; border: 2px solid #ddd; border-radius: 8px; text-align: center; cursor: pointer;">
              <input type="radio" name="projectType" value="side" style="margin-right: 5px;">
              <div>🚀 Side Project</div>
            </label>
          </div>
        </div>
        <div style="background: #f0f7ff; border-left: 4px solid #2196f3; padding: 15px; border-radius: 4px;">
          <strong>💡 Tip:</strong> Choose the project type that best matches your workflow. This will help us customize your experience.
        </div>
      </div>
    `,
    buttons: [
      {
        label: 'Cancel',
        icon: 'close',
      },
      {
        label: 'Next Step',
        icon: 'arrow_forward',
        color: 'primary',
        onClick: async () => {
          console.log('Moving to next step in wizard');
          await PluginAPI.showSnack({
            msg: 'Would proceed to Settings step',
            type: 'CUSTOM',
            ico: 'arrow_forward',
          });
        },
      },
    ],
  });

  // Interactive task planner dialog
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await PluginAPI.openDialog({
    title: 'AI Task Planner (Demo)',
    htmlContent: `
      <div style="padding: 20px; max-width: 700px;">
        <div style="display: flex; gap: 20px;">
          <div style="flex: 1;">
            <h4 style="margin-top: 0;">Describe Your Goal</h4>
            <textarea style="width: 100%; min-height: 100px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-family: inherit;" placeholder="E.g., 'Launch a new mobile app by Q3 2024'">Build a comprehensive plugin system for Super Productivity that allows users to extend functionality</textarea>
            
            <h4 style="margin-top: 20px;">Constraints & Preferences</h4>
            <div style="margin-bottom: 10px;">
              <label>
                <input type="checkbox" checked> Break down into weekly milestones
              </label>
            </div>
            <div style="margin-bottom: 10px;">
              <label>
                <input type="checkbox" checked> Include time estimates
              </label>
            </div>
            <div style="margin-bottom: 10px;">
              <label>
                <input type="checkbox"> Add dependencies between tasks
              </label>
            </div>
            <div style="margin-bottom: 10px;">
              <label>
                <input type="checkbox" checked> Prioritize by impact
              </label>
            </div>
          </div>
          
          <div style="flex: 1; background: #f9f9f9; padding: 15px; border-radius: 8px;">
            <h4 style="margin-top: 0;">Generated Task Breakdown</h4>
            <div style="max-height: 300px; overflow-y: auto;">
              <div style="margin-bottom: 15px; padding: 10px; background: white; border-radius: 4px; border-left: 4px solid #4caf50;">
                <div style="font-weight: bold;">📋 Design Plugin Architecture</div>
                <div style="font-size: 0.9em; color: #666; margin-top: 5px;">Est: 8h | Priority: High</div>
                <div style="font-size: 0.85em; margin-top: 5px;">Define API surface, security model, and manifest structure</div>
              </div>
              <div style="margin-bottom: 15px; padding: 10px; background: white; border-radius: 4px; border-left: 4px solid #ff9800;">
                <div style="font-weight: bold;">🔧 Implement Core Plugin Loader</div>
                <div style="font-size: 0.9em; color: #666; margin-top: 5px;">Est: 16h | Priority: High</div>
                <div style="font-size: 0.85em; margin-top: 5px;">Build sandboxed execution environment and API bridge</div>
              </div>
              <div style="margin-bottom: 15px; padding: 10px; background: white; border-radius: 4px; border-left: 4px solid #2196f3;">
                <div style="font-weight: bold;">🎨 Create Plugin UI Components</div>
                <div style="font-size: 0.9em; color: #666; margin-top: 5px;">Est: 12h | Priority: Medium</div>
                <div style="font-size: 0.85em; margin-top: 5px;">Design settings UI, permission dialogs, and plugin store</div>
              </div>
              <div style="margin-bottom: 15px; padding: 10px; background: white; border-radius: 4px; border-left: 4px solid #9c27b0;">
                <div style="font-weight: bold;">📚 Write Documentation</div>
                <div style="font-size: 0.9em; color: #666; margin-top: 5px;">Est: 6h | Priority: Medium</div>
                <div style="font-size: 0.85em; margin-top: 5px;">Create plugin development guide and API reference</div>
              </div>
            </div>
          </div>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px;">
          <strong>🤖 AI Analysis:</strong> This project would take approximately 42 hours (5-6 days) with the current breakdown. Consider adding a testing phase and security audit.
        </div>
      </div>
    `,
    buttons: [
      {
        label: 'Regenerate',
        icon: 'refresh',
        onClick: async () => {
          await PluginAPI.showSnack({
            msg: 'Regenerating task breakdown...',
            type: 'CUSTOM',
            ico: 'refresh',
          });
        },
      },
      {
        label: 'Create All Tasks',
        icon: 'add_task',
        color: 'primary',
        onClick: async () => {
          await PluginAPI.showSnack({
            msg: 'Would create 4 tasks in your project',
            type: 'SUCCESS',
          });
        },
      },
    ],
  });

  // Data visualization dialog
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await PluginAPI.openDialog({
    title: 'Productivity Analytics',
    htmlContent: `
      <div style="padding: 20px; max-width: 800px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
          <div>
            <h3 style="margin: 0;">Weekly Performance</h3>
            <p style="margin: 5px 0; color: #666;">Dec 11 - Dec 17, 2023</p>
          </div>
          <div style="display: flex; gap: 10px; align-items: center;">
            <button style="padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">Week</button>
            <button style="padding: 8px 16px; border: 1px solid #4caf50; background: #4caf50; color: white; border-radius: 4px; cursor: pointer;">Month</button>
            <button style="padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">Year</button>
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px;">
            <div style="font-size: 2em; font-weight: bold;">147</div>
            <div style="opacity: 0.9;">Tasks Completed</div>
            <div style="font-size: 0.9em; margin-top: 5px; opacity: 0.8;">↑ 23% from last week</div>
          </div>
          <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 8px;">
            <div style="font-size: 2em; font-weight: bold;">42.5h</div>
            <div style="opacity: 0.9;">Time Tracked</div>
            <div style="font-size: 0.9em; margin-top: 5px; opacity: 0.8;">↑ 5% from last week</div>
          </div>
          <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 20px; border-radius: 8px;">
            <div style="font-size: 2em; font-weight: bold;">89%</div>
            <div style="opacity: 0.9;">Focus Score</div>
            <div style="font-size: 0.9em; margin-top: 5px; opacity: 0.8;">↓ 2% from last week</div>
          </div>
          <div style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white; padding: 20px; border-radius: 8px;">
            <div style="font-size: 2em; font-weight: bold;">12</div>
            <div style="opacity: 0.9;">Streaks Active</div>
            <div style="font-size: 0.9em; margin-top: 5px; opacity: 0.8;">Keep it up! 🔥</div>
          </div>
        </div>
        
        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px;">
          <h4 style="margin-top: 0;">Daily Activity Heatmap</h4>
          <div style="display: grid; grid-template-columns: auto repeat(7, 1fr); gap: 10px; font-size: 0.9em;">
            <div></div>
            <div style="text-align: center;">Mon</div>
            <div style="text-align: center;">Tue</div>
            <div style="text-align: center;">Wed</div>
            <div style="text-align: center;">Thu</div>
            <div style="text-align: center;">Fri</div>
            <div style="text-align: center;">Sat</div>
            <div style="text-align: center;">Sun</div>
            
            <div>Morning</div>
            <div style="background: #c8e6c9; height: 40px; border-radius: 4px;"></div>
            <div style="background: #4caf50; height: 40px; border-radius: 4px;"></div>
            <div style="background: #81c784; height: 40px; border-radius: 4px;"></div>
            <div style="background: #4caf50; height: 40px; border-radius: 4px;"></div>
            <div style="background: #a5d6a7; height: 40px; border-radius: 4px;"></div>
            <div style="background: #e8f5e9; height: 40px; border-radius: 4px;"></div>
            <div style="background: #e8f5e9; height: 40px; border-radius: 4px;"></div>
            
            <div>Afternoon</div>
            <div style="background: #4caf50; height: 40px; border-radius: 4px;"></div>
            <div style="background: #2e7d32; height: 40px; border-radius: 4px;"></div>
            <div style="background: #4caf50; height: 40px; border-radius: 4px;"></div>
            <div style="background: #81c784; height: 40px; border-radius: 4px;"></div>
            <div style="background: #4caf50; height: 40px; border-radius: 4px;"></div>
            <div style="background: #a5d6a7; height: 40px; border-radius: 4px;"></div>
            <div style="background: #c8e6c9; height: 40px; border-radius: 4px;"></div>
            
            <div>Evening</div>
            <div style="background: #81c784; height: 40px; border-radius: 4px;"></div>
            <div style="background: #a5d6a7; height: 40px; border-radius: 4px;"></div>
            <div style="background: #c8e6c9; height: 40px; border-radius: 4px;"></div>
            <div style="background: #e8f5e9; height: 40px; border-radius: 4px;"></div>
            <div style="background: #e8f5e9; height: 40px; border-radius: 4px;"></div>
            <div style="background: #81c784; height: 40px; border-radius: 4px;"></div>
            <div style="background: #4caf50; height: 40px; border-radius: 4px;"></div>
          </div>
          <div style="margin-top: 15px; text-align: center; color: #666;">
            <span style="display: inline-block; width: 12px; height: 12px; background: #e8f5e9; margin-right: 5px;"></span> Low
            <span style="display: inline-block; width: 12px; height: 12px; background: #81c784; margin: 0 5px 0 20px;"></span> Medium
            <span style="display: inline-block; width: 12px; height: 12px; background: #4caf50; margin: 0 5px 0 20px;"></span> High
            <span style="display: inline-block; width: 12px; height: 12px; background: #2e7d32; margin: 0 5px 0 20px;"></span> Very High
          </div>
        </div>
      </div>
    `,
    buttons: [
      {
        label: 'Export Report',
        icon: 'download',
        onClick: async () => {
          await PluginAPI.showSnack({
            msg: 'Generating productivity report...',
            type: 'CUSTOM',
            ico: 'download',
          });
        },
      },
      {
        label: 'Share',
        icon: 'share',
        onClick: async () => {
          await PluginAPI.showSnack({
            msg: 'Sharing options would appear here',
            type: 'CUSTOM',
            ico: 'share',
          });
        },
      },
      {
        label: 'Close',
        icon: 'close',
        color: 'primary',
      },
    ],
  });

  console.log('Complex dialog tests completed');
}

// Register menu entries for dialog examples
PluginAPI.registerMenuEntry({
  label: 'Advanced Dialog Examples',
  icon: 'web_stories',
  onClick: testAdvancedDialogs,
});

PluginAPI.registerMenuEntry({
  label: 'Complex Dialog Examples',
  icon: 'dashboard_customize',
  onClick: testComplexDialogs,
});

// Show initialization message
setTimeout(() => {
  PluginAPI.showSnack({
    msg: 'API Test Plugin ready! Use header button to run tests.',
    type: 'SUCCESS',
    ico: 'check',
  });
}, 500);
