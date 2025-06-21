#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const distDir = path.join(__dirname, '..', 'dist');
const outputPath = path.join(distDir, 'plugin.zip');

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  console.error('Error: dist directory not found. Run "npm run build" first.');
  process.exit(1);
}

// Check if required files exist
const requiredFiles = ['plugin.js', 'manifest.json'];
const missingFiles = requiredFiles.filter(
  (file) => !fs.existsSync(path.join(distDir, file)),
);

if (missingFiles.length > 0) {
  console.error(`Error: Missing required files: ${missingFiles.join(', ')}`);
  console.error('Run "npm run build" first.');
  process.exit(1);
}

// Create output stream
const output = fs.createWriteStream(outputPath);
const archive = archiver('zip', {
  zlib: { level: 9 }, // Maximum compression
});

// Listen for archive events
output.on('close', () => {
  const size = (archive.pointer() / 1024).toFixed(2);
  console.log(`✓ Plugin packaged successfully: ${outputPath} (${size} KB)`);
});

archive.on('error', (err) => {
  console.error('Error creating archive:', err);
  process.exit(1);
});

// Pipe archive data to the file
archive.pipe(output);

// Add files to the archive
console.log('Packaging plugin...');

// Add required files
archive.file(path.join(distDir, 'plugin.js'), { name: 'plugin.js' });
archive.file(path.join(distDir, 'manifest.json'), { name: 'manifest.json' });

// Add optional files if they exist
const optionalFiles = ['index.html', 'icon.svg'];
optionalFiles.forEach((file) => {
  const filePath = path.join(distDir, file);
  if (fs.existsSync(filePath)) {
    archive.file(filePath, { name: file });
    console.log(`  Added: ${file}`);
  }
});

// Finalize the archive
archive.finalize();
