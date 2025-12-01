import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, '../dist');
const targetDir = path.join(
  __dirname,
  '../../../../src/assets/bundled-plugins/ai-productivity-prompts',
);

// Read the HTML file
const htmlPath = path.join(distDir, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// Read and inline JavaScript
const jsPath = path.join(distDir, 'index.js');
if (fs.existsSync(jsPath)) {
  const js = fs.readFileSync(jsPath, 'utf8');
  // Find script tag and replace with inline version, preserving type="module"
  html = html.replace(
    /<script([^>]*)src="[^"]*index\.js"[^>]*><\/script>/g,
    (match, attrs) => {
      // Check if it has type="module"
      if (attrs.includes('type="module"') || match.includes('type="module"')) {
        return `<script type="module">${js}</script>`;
      }
      return `<script>${js}</script>`;
    },
  );
}

// Read and inline CSS
const cssPath = path.join(distDir, 'index.css');
if (fs.existsSync(cssPath)) {
  const css = fs.readFileSync(cssPath, 'utf8');
  html = html.replace(/<link[^>]*href="[^"]*index\.css"[^>]*>/g, `<style>${css}</style>`);
}

// Create target directory if it doesn't exist
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Write the inlined HTML to the target directory
const targetHtmlPath = path.join(targetDir, 'index.html');
fs.writeFileSync(targetHtmlPath, html);

// Copy other required files
const filesToCopy = ['manifest.json', 'plugin.js', 'icon.svg'];
filesToCopy.forEach((file) => {
  const srcPath = path.join(distDir, file);
  const destPath = path.join(targetDir, file);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
  }
});

console.log('Assets inlined and deployed successfully!');
