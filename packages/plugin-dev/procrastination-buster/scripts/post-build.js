#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('Post-build: Preparing files for Super Productivity...');

const distDir = path.join(__dirname, '..', 'dist');

// Copy manifest.json to dist
const manifestSrc = path.join(__dirname, '..', 'manifest.json');
const manifestDest = path.join(distDir, 'manifest.json');
fs.copyFileSync(manifestSrc, manifestDest);
console.log('✓ Copied manifest.json');

// Create/copy icon.svg if it exists
const iconSrc = path.join(__dirname, '..', 'icon.svg');
if (fs.existsSync(iconSrc)) {
  const iconDest = path.join(distDir, 'icon.svg');
  fs.copyFileSync(iconSrc, iconDest);
  console.log('✓ Copied icon.svg');
} else {
  // Create a simple default icon
  const defaultIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
</svg>`;
  fs.writeFileSync(path.join(distDir, 'icon.svg'), defaultIcon);
  console.log('✓ Created default icon.svg');
}

// Fix paths in index.html to be relative
const indexPath = path.join(distDir, 'index.html');
if (fs.existsSync(indexPath)) {
  let indexContent = fs.readFileSync(indexPath, 'utf-8');
  // Fix script and asset paths to be relative
  indexContent = indexContent.replace(/src="\/src\//g, 'src="./');
  indexContent = indexContent.replace(/href="\/src\//g, 'href="./');
  indexContent = indexContent.replace(/src="\/assets\//g, 'src="./assets/');
  indexContent = indexContent.replace(/href="\/assets\//g, 'href="./assets/');
  fs.writeFileSync(indexPath, indexContent);
  console.log('✓ Fixed paths in index.html');
}

console.log('\n✅ Build complete! Files ready in dist/');
