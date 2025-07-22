#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { build } = require('esbuild');

const ROOT_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

async function buildPlugin() {
  console.log('Building sync-md plugin with esbuild...');

  // Clean dist directory
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true });
  }
  fs.mkdirSync(DIST_DIR);

  try {
    // Build the background script
    console.log('Building plugin.js...');
    await build({
      entryPoints: [path.join(SRC_DIR, 'background/background.ts')],
      bundle: true,
      outfile: path.join(DIST_DIR, 'plugin.js'),
      platform: 'browser',
      target: 'es2020',
      format: 'iife',
      globalName: 'SyncMdPlugin',
      define: {
        'process.env.NODE_ENV': '"production"',
      },
      banner: {
        js: `// sync-md plugin v2.0.0
// This file is auto-generated. Do not edit directly.
`,
      },
      external: ['fs', 'path', 'child_process'],
      logLevel: 'info',
      minify: true,
      sourcemap: false,
    });

    // Copy index.html
    console.log('Copying index.html...');
    fs.copyFileSync(
      path.join(SRC_DIR, 'ui', 'index.html'),
      path.join(DIST_DIR, 'index.html'),
    );

    // Copy manifest.json
    console.log('Copying manifest.json...');
    fs.copyFileSync(
      path.join(SRC_DIR, 'manifest.json'),
      path.join(DIST_DIR, 'manifest.json'),
    );

    // Copy or create icon.svg
    console.log('Copying icon.svg...');
    const iconPath = path.join(SRC_DIR, 'assets', 'icon.svg');
    if (fs.existsSync(iconPath)) {
      fs.copyFileSync(iconPath, path.join(DIST_DIR, 'icon.svg'));
    } else {
      // Create a simple default icon if not exists
      const defaultIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
  <polyline points="14 2 14 8 20 8"/>
  <line x1="9" y1="15" x2="15" y2="15"/>
</svg>`;
      fs.writeFileSync(path.join(DIST_DIR, 'icon.svg'), defaultIcon);
    }
    console.log('\nBuild complete! Output in dist/');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

// Run the build
buildPlugin();
