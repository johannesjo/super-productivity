import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the built files
const distPath = path.join(__dirname, '../dist');
const htmlPath = path.join(distPath, 'index.html');
const jsPath = path.join(distPath, 'index.js');
const cssPath = path.join(distPath, 'index.css');

// Read the original HTML built by Vite
const originalHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0"
    />
    <title>Sync.md</title>
    <script type="module" crossorigin src="./index.js"></script>
    <link rel="stylesheet" crossorigin href="./index.css">
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

// Read the built JS and CSS
const js = fs.readFileSync(jsPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');

// Create the inlined HTML
const inlinedHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0"
    />
    <title>Sync.md</title>
    <script type="module">${js}</script>
    <style>${css}</style>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

// Write the inlined HTML
fs.writeFileSync(htmlPath, inlinedHtml);

console.log('Successfully inlined JavaScript and CSS into index.html');
