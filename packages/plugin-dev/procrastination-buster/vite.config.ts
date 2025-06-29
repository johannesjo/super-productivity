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

        // Move index.html from src subdirectory to root
        const htmlSrc = path.resolve(__dirname, 'dist/src/index.html');
        const htmlDest = path.resolve(__dirname, 'dist/index.html');
        if (fs.existsSync(htmlSrc)) {
          fs.renameSync(htmlSrc, htmlDest);
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
        plugin: resolve(__dirname, 'src/plugin.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: '[name].[ext]',
      },
    },
    copyPublicDir: false,
  },
  publicDir: 'src/assets',
});
