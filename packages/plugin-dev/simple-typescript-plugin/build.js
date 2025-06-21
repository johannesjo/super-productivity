#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Building plugin...');

// Ensure dist directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// Compile TypeScript
console.log('Compiling TypeScript...');
execSync('tsc', { stdio: 'inherit' });

// Copy manifest
console.log('Copying manifest...');
fs.copyFileSync('manifest.json', 'dist/manifest.json');

// Copy optional assets
if (fs.existsSync('icon.svg')) {
  fs.copyFileSync('icon.svg', 'dist/icon.svg');
}
if (fs.existsSync('index.html')) {
  fs.copyFileSync('index.html', 'dist/index.html');
}

// Create ZIP
console.log('Creating plugin.zip...');
execSync('cd dist && zip -r plugin.zip *', { stdio: 'inherit' });

console.log('✓ Build complete! Output in dist/');
