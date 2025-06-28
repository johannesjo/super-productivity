const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Create a test plugin ZIP file for e2e tests
async function createTestPlugin() {
  const outputPath = path.join(__dirname, 'test-plugin.zip');

  // Create a write stream for the output ZIP
  const output = fs.createWriteStream(outputPath);
  const archive = archiver('zip', {
    zlib: { level: 9 },
  });

  // Handle archive events
  output.on('close', () => {
    console.log(`Test plugin created: ${outputPath}`);
    console.log(`Total size: ${archive.pointer()} bytes`);
  });

  archive.on('error', (err) => {
    throw err;
  });

  // Pipe archive data to the file
  archive.pipe(output);

  // Add manifest.json
  const manifest = {
    name: 'Test Upload Plugin',
    id: 'test-upload-plugin',
    manifestVersion: 1,
    version: '1.0.0',
    minSupVersion: '13.0.0',
    description: 'A test plugin for e2e upload testing',
    hooks: ['taskComplete'],
    permissions: [
      'PluginAPI.showSnack',
      'PluginAPI.showIndexHtmlAsView',
      'PluginAPI.getTasks',
    ],
    iFrame: true,
    isSkipMenuEntry: false,
    type: 'standard',
    assets: [],
  };

  archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });

  // Add plugin.js
  const pluginCode = `
// Test Upload Plugin
console.log('Test Upload Plugin initializing...');

// Register a simple hook
PluginAPI.registerHook(PluginAPI.Hooks.TASK_COMPLETE, function(taskData) {
  console.log('Test Upload Plugin: Task completed!', taskData);
  
  PluginAPI.showSnack({
    msg: '🧪 Test Plugin: Task completed!',
    type: 'SUCCESS'
  });
});

// Show initialization message
setTimeout(() => {
  PluginAPI.showSnack({
    msg: '🧪 Test Upload Plugin initialized!',
    type: 'SUCCESS'
  });
}, 1000);

console.log('Test Upload Plugin loaded successfully');
`;

  archive.append(pluginCode, { name: 'plugin.js' });

  // Add index.html
  const indexHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Upload Plugin</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 20px;
      text-align: center;
    }
    h1 {
      color: #2196f3;
    }
    .stats {
      margin: 20px 0;
      padding: 20px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    button {
      background: #2196f3;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      margin: 5px;
    }
    button:hover {
      background: #1976d2;
    }
  </style>
</head>
<body>
  <h1>Test Upload Plugin</h1>
  <p>This is a test plugin for e2e testing</p>
  
  <div class="stats">
    <h2>Stats</h2>
    <p>Tasks: <span id="taskCount">-</span></p>
  </div>
  
  <button onclick="loadStats()">Load Stats</button>
  <button onclick="showNotification()">Show Notification</button>
  
  <script>
    function waitForPluginAPI() {
      if (typeof PluginAPI !== 'undefined') {
        console.log('PluginAPI available in test plugin iframe');
        loadStats();
      } else {
        setTimeout(waitForPluginAPI, 100);
      }
    }
    
    async function loadStats() {
      try {
        const tasks = await PluginAPI.getTasks();
        document.getElementById('taskCount').textContent = tasks.length;
      } catch (error) {
        console.error('Error loading stats:', error);
      }
    }
    
    async function showNotification() {
      PluginAPI.showSnack({
        msg: 'Test notification from iframe!',
        type: 'SUCCESS'
      });
    }
    
    waitForPluginAPI();
  </script>
</body>
</html>
`;

  archive.append(indexHtml, { name: 'index.html' });

  // Finalize the archive
  await archive.finalize();
}

// Check if archiver is installed
try {
  require.resolve('archiver');
  createTestPlugin().catch(console.error);
} catch (e) {
  console.log('Please install archiver first: npm install --save-dev archiver');
  console.log('Then run this script again to create the test plugin.');
}
