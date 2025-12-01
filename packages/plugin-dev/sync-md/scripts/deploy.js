#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const TARGET_DIR = path.join(
  ROOT_DIR,
  '..',
  '..',
  '..',
  'src',
  'assets',
  'bundled-plugins',
  'sync-md',
);

// Files to copy
const FILES_TO_COPY = ['manifest.json', 'plugin.js', 'index.html', 'icon.svg'];

async function deploy() {
  console.log('Deploying sync-md plugin...');

  // Check if dist directory exists
  if (!fs.existsSync(DIST_DIR)) {
    console.error('Error: dist directory not found. Run "npm run build" first.');
    process.exit(1);
  }

  // Create target directory if it doesn't exist
  if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
    console.log(`Created target directory: ${TARGET_DIR}`);
  }

  // Copy files
  let copiedCount = 0;
  for (const file of FILES_TO_COPY) {
    const src = path.join(DIST_DIR, file);
    const dest = path.join(TARGET_DIR, file);

    try {
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`✓ Copied ${file}`);
        copiedCount++;
      } else {
        console.warn(`⚠ Warning: ${file} not found in dist directory`);
      }
    } catch (error) {
      console.error(`✗ Error copying ${file}:`, error.message);
    }
  }

  console.log(
    `\n✅ Deployment complete! Copied ${copiedCount}/${FILES_TO_COPY.length} files to:`,
  );
  console.log(`   ${TARGET_DIR}`);
}

// Run deployment
deploy().catch((error) => {
  console.error('Deployment failed:', error);
  process.exit(1);
});
