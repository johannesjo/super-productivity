#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');

const file = process.argv[2];
if (!file) {
  console.error('❌ Please provide a test file path');
  process.exit(1);
}

// Get absolute path
const absolutePath = path.resolve(file);

try {
  console.log(`🧪 Running tests for ${path.basename(file)}...`);

  // Run the test directly with cross-env
  const { execSync: exec } = require('child_process');
  const output = exec(
    `./node_modules/.bin/cross-env TZ='Europe/Berlin' ./node_modules/.bin/ng test --watch=false --include="${absolutePath}"`,
    {
      stdio: 'pipe',
      encoding: 'utf8',
      shell: true,
      timeout: 25000, // 25 second timeout
    },
  );

  // Extract test results
  const lines = output.split('\n');
  const successLine = lines.find(
    (line) => line.includes('SUCCESS') || line.includes('FAILED'),
  );
  const totalLine = lines.find((line) => line.includes('TOTAL:'));

  if (totalLine) {
    const match = totalLine.match(/TOTAL: (\d+) (?:SUCCESS|FAILED)/);
    if (match) {
      const totalTests = match[1];
      if (successLine && successLine.includes('SUCCESS')) {
        console.log(`✅ All ${totalTests} tests passed!`);
      } else {
        console.log(`❌ ${totalLine.trim()}`);
      }
    } else {
      console.log(`✅ Tests completed: ${totalLine.trim()}`);
    }
  } else if (successLine) {
    console.log(`✅ ${successLine.trim()}`);
  } else {
    // Fallback - just indicate completion
    console.log(`✅ Tests completed for ${path.basename(file)}`);
  }
} catch (error) {
  // If there's an error, show the full output
  console.error('\n❌ Test failures:\n');
  console.error(error.stdout || error.stderr || error.message);
  process.exit(1);
}
