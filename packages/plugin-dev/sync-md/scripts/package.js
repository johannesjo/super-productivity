import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { zip } from 'fflate';

const distDir = join(process.cwd(), 'dist');
const pluginName = 'sync-md';

// Read built index.html
const indexHtml = readFileSync(join(distDir, 'index.html'), 'utf8');

// Read other plugin files
const manifest = readFileSync('manifest.json', 'utf8');
const pluginJs = readFileSync('plugin.js', 'utf8');
const icon = readFileSync('sync-md-icon.svg', 'utf8');

// Create plugin zip
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
