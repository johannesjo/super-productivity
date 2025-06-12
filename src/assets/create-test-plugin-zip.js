const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create test plugin ZIP using the system zip command
const testPluginDir = path.join(__dirname, 'test-plugin');
const outputZip = path.join(__dirname, 'test-plugin.zip');

// Remove existing ZIP if it exists
if (fs.existsSync(outputZip)) {
  fs.unlinkSync(outputZip);
}

// Create ZIP file using system zip command
try {
  // Change to the test-plugin directory and create zip
  execSync(`cd "${testPluginDir}" && zip -r "${outputZip}" manifest.json plugin.js`, {
    stdio: 'inherit',
  });
  console.log(`✅ Created test plugin ZIP at: ${outputZip}`);

  // Verify the ZIP was created
  const stats = fs.statSync(outputZip);
  console.log(`   Size: ${stats.size} bytes`);
} catch (error) {
  console.error('❌ Failed to create ZIP:', error.message);
  process.exit(1);
}
