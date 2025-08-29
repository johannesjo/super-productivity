#!/usr/bin/env node
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.dirname(__dirname);

console.log('🚀 Starting development server with auto-packaging...\n');

// Start Vite dev server
const viteProcess = spawn('npm', ['run', 'dev'], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: true,
});

// Watch for changes and rebuild package
const srcPath = path.join(projectRoot, 'src');
let buildTimeout;

const rebuildPackage = () => {
  if (buildTimeout) clearTimeout(buildTimeout);

  buildTimeout = setTimeout(async () => {
    console.log('\n📦 Building plugin package...');

    const buildProcess = spawn('npm', ['run', 'build'], {
      cwd: projectRoot,
      stdio: 'inherit',
      shell: true,
    });

    buildProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Plugin package built successfully!\n');
      } else {
        console.error('❌ Failed to build plugin package\n');
      }
    });
  }, 1000); // Debounce for 1 second
};

// Watch src directory for changes
fs.watch(srcPath, { recursive: true }, (eventType, filename) => {
  if (filename && !filename.includes('.swp') && !filename.includes('.tmp')) {
    console.log(`📝 Change detected in ${filename}`);
    rebuildPackage();
  }
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Stopping development server...');
  viteProcess.kill();
  process.exit();
});

viteProcess.on('close', (code) => {
  console.log(`Vite process exited with code ${code}`);
  process.exit(code);
});
