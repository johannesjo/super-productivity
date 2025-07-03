import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { resolve } from 'path';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  base: './',
  plugins: [
    solidPlugin(),
    {
      name: 'copy-files',
      closeBundle() {
        // Copy manifest.json to dist
        const manifestSrc = path.resolve(__dirname, 'src/manifest.json');
        const manifestDest = path.resolve(__dirname, 'dist/manifest.json');
        fs.copyFileSync(manifestSrc, manifestDest);

        // Copy icon.svg to dist root
        const iconSrc = path.resolve(__dirname, 'src/assets/icon.svg');
        const iconDest = path.resolve(__dirname, 'dist/icon.svg');
        fs.copyFileSync(iconSrc, iconDest);

        // Copy simple-plugin.js as plugin.js
        const pluginSrc = path.resolve(__dirname, 'src/simple-plugin.js');
        const pluginDest = path.resolve(__dirname, 'dist/plugin.js');
        fs.copyFileSync(pluginSrc, pluginDest);

        // Move index.html from src subdirectory to root and fix paths
        const htmlSrc = path.resolve(__dirname, 'dist/src/index.html');
        const htmlDest = path.resolve(__dirname, 'dist/index.html');
        if (fs.existsSync(htmlSrc)) {
          // Read the HTML content
          let htmlContent = fs.readFileSync(htmlSrc, 'utf8');
          // Fix the paths to be relative to the plugin root
          htmlContent = htmlContent.replace(/src="\.\.\/index\.js"/g, 'src="./index.js"');
          htmlContent = htmlContent.replace(
            /href="\.\.\/index\.css"/g,
            'href="./index.css"',
          );
          // Write the fixed HTML
          fs.writeFileSync(htmlDest, htmlContent);
          // Remove the src directory
          fs.rmSync(path.resolve(__dirname, 'dist/src'), {
            recursive: true,
            force: true,
          });
        }
      },
    },
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'src/index.html'),
        background: resolve(__dirname, 'src/background.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: '[name].[ext]',
        format: 'iife',
      },
    },
    copyPublicDir: false,
  },
  publicDir: 'src/assets',
});
