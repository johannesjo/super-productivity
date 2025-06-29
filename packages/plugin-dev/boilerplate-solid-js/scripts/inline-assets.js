import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const distDir = path.join(__dirname, '..', 'dist');
const htmlPath = path.join(distDir, 'index.html');
const jsPath = path.join(distDir, 'index.js');
const cssPath = path.join(distDir, 'index.css');

if (!fs.existsSync(htmlPath)) {
  console.error('index.html not found in dist directory');
  process.exit(1);
}

let html = fs.readFileSync(htmlPath, 'utf8');

// Read and inline JavaScript
if (fs.existsSync(jsPath)) {
  const js = fs.readFileSync(jsPath, 'utf8');
  // Replace the script tag, preserving the type="module" attribute if present
  html = html.replace(
    /<script([^>]*)src="[^"]*index\.js"[^>]*><\/script>/g,
    (match, attrs) => {
      // Check if type="module" is in the attributes or in the match
      if (attrs.includes('type="module"') || match.includes('type="module"')) {
        return `<script type="module">${js}</script>`;
      }
      return `<script>${js}</script>`;
    },
  );
}

// Read and inline CSS
if (fs.existsSync(cssPath)) {
  const css = fs.readFileSync(cssPath, 'utf8');
  // Replace the link tag with style tag
  html = html.replace(
    /<link[^>]*rel="stylesheet"[^>]*href="[^"]*index\.css"[^>]*>/g,
    `<style>${css}</style>`,
  );
}

// Write the updated HTML back
fs.writeFileSync(htmlPath, html);

console.log('✅ Assets inlined successfully');
