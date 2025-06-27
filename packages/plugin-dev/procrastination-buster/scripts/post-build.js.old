#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('Post-build: Preparing files for Super Productivity...');

const distDir = path.join(__dirname, '..', 'dist');
const targetDir = path.join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'src',
  'assets',
  'procrastination-buster',
);

// Ensure target directory exists
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Copy manifest.json to dist and target
const manifestSrc = path.join(__dirname, '..', 'manifest.json');
const manifestDest = path.join(distDir, 'manifest.json');
fs.copyFileSync(manifestSrc, manifestDest);
fs.copyFileSync(manifestSrc, path.join(targetDir, 'manifest.json'));
console.log('✓ Copied manifest.json');

// Create/copy icon.svg if it exists
let iconSrc = path.join(__dirname, '..', 'src', 'icon.svg');
if (!fs.existsSync(iconSrc)) {
  iconSrc = path.join(__dirname, '..', 'icon.svg');
}

if (fs.existsSync(iconSrc)) {
  const iconDest = path.join(distDir, 'icon.svg');
  fs.copyFileSync(iconSrc, iconDest);
  fs.copyFileSync(iconSrc, path.join(targetDir, 'icon.svg'));
  console.log('✓ Copied icon.svg');
} else {
  // Create a simple default icon
  const defaultIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
</svg>`;
  fs.writeFileSync(path.join(distDir, 'icon.svg'), defaultIcon);
  fs.writeFileSync(path.join(targetDir, 'icon.svg'), defaultIcon);
  console.log('✓ Created default icon.svg');
}

// Inline JS and CSS into HTML
const indexPath = path.join(distDir, 'index.html');
if (fs.existsSync(indexPath)) {
  let indexContent = fs.readFileSync(indexPath, 'utf-8');

  // Find and inline JS - handle both absolute and relative paths
  const jsPath = path.join(distDir, 'index.js');
  if (fs.existsSync(jsPath)) {
    const jsContent = fs.readFileSync(jsPath, 'utf-8');
    // Match various script tag formats
    indexContent = indexContent.replace(
      /<script\s+type="module"[^>]*\s+src=["']([^"']*index\.js)["'][^>]*><\/script>/i,
      `<script type="module">${jsContent}</script>`,
    );
  }

  // Find and inline CSS - handle both absolute and relative paths
  const cssPath = path.join(distDir, 'index.css');
  if (fs.existsSync(cssPath)) {
    const cssContent = fs.readFileSync(cssPath, 'utf-8');
    // Match various link tag formats
    indexContent = indexContent.replace(
      /<link\s+rel="stylesheet"[^>]*\s+href=["']([^"']*index\.css)["'][^>]*\/?>/i,
      `<style>${cssContent}</style>`,
    );
  }

  // Save inlined version
  fs.writeFileSync(indexPath, indexContent);
  console.log('✓ Inlined JS and CSS into index.html');
}

// Copy files to Super Productivity assets
if (fs.existsSync(path.join(distDir, 'plugin.js'))) {
  fs.copyFileSync(path.join(distDir, 'plugin.js'), path.join(targetDir, 'plugin.js'));
}
if (fs.existsSync(indexPath)) {
  fs.copyFileSync(indexPath, path.join(targetDir, 'index.html'));
}
if (fs.existsSync(path.join(distDir, 'index.js'))) {
  fs.copyFileSync(path.join(distDir, 'index.js'), path.join(targetDir, 'index.js'));
}
if (fs.existsSync(path.join(distDir, 'index.css'))) {
  fs.copyFileSync(path.join(distDir, 'index.css'), path.join(targetDir, 'index.css'));
}

console.log('✓ Copied files to Super Productivity assets');
console.log('\n✅ Build complete! Files ready in dist/');
