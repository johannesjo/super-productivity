const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Build the plugin entry file as an IIFE
const pluginEntryPath = path.resolve(__dirname, 'src/plugin-entry.ts');
const outputPath = path.resolve(__dirname, 'dist/plugin.js');

// Ensure dist directory exists
if (!fs.existsSync(path.dirname(outputPath))) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
}

// First, compile TypeScript to JavaScript
console.log('Compiling plugin entry...');
execSync(
  `npx esbuild "${pluginEntryPath}" --bundle --format=iife --outfile="${outputPath}" --platform=browser`,
  { stdio: 'inherit' },
);

console.log('Plugin entry built successfully!');
