import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { zip } from 'fflate';

const distDir = join(process.cwd(), 'dist');
const pluginName = 'sync-md';

// Read built index.html
let indexHtml = readFileSync(join(distDir, 'index.html'), 'utf8');

// Read and inline CSS and JS assets
const assetsDir = join(distDir, 'assets');
try {
  const assetFiles = readdirSync(assetsDir);

  assetFiles.forEach((filename) => {
    const content = readFileSync(join(assetsDir, filename), 'utf8');

    if (filename.endsWith('.css')) {
      // Inline CSS
      const cssTag = `<link rel="stylesheet" crossorigin href="/assets/${filename}">`;
      const inlineCSS = `<style>${content}</style>`;
      indexHtml = indexHtml.replace(cssTag, inlineCSS);
    } else if (filename.endsWith('.js')) {
      // Inline JS
      const jsTag = `<script type="module" crossorigin src="/assets/${filename}"></script>`;
      const inlineJS = `<script type="module">${content}</script>`;
      indexHtml = indexHtml.replace(jsTag, inlineJS);
    }
  });
} catch (error) {
  console.warn('No assets directory found, skipping inlining');
}

// Read other plugin files
const manifest = readFileSync('manifest.json', 'utf8');
const pluginJs = readFileSync('plugin.js', 'utf8');
const icon = readFileSync('sync-md-icon.svg', 'utf8');

// Create plugin zip - only include the inlined HTML, no separate assets
const files = {
  'manifest.json': new TextEncoder().encode(manifest),
  'plugin.js': new TextEncoder().encode(pluginJs),
  'index.html': new TextEncoder().encode(indexHtml),
  'sync-md-icon.svg': new TextEncoder().encode(icon),
};

// Create zip
zip(files, { level: 9 }, (err, data) => {
  if (err) {
    console.error('Error creating zip:', err);
    process.exit(1);
  }

  // Ensure dist directory exists
  mkdirSync(distDir, { recursive: true });

  // Write zip file
  writeFileSync(join(distDir, `${pluginName}.zip`), data);
  console.log(`✓ Created ${pluginName}.zip in dist/`);
});
