import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { promises as fs } from 'fs';
import path from 'path';

// Custom plugin to copy built files to assets folder
const copyToAssetsPlugin = () => {
  const assetsDir = path.resolve(__dirname, '../../../src/assets/procrastination-buster');

  return {
    name: 'copy-to-assets',
    async writeBundle(options, bundle) {
      // Ensure assets directory exists
      await fs.mkdir(assetsDir, { recursive: true });

      // First, copy all files as-is
      for (const [fileName, fileInfo] of Object.entries(bundle)) {
        if (fileInfo.type === 'chunk' || fileInfo.type === 'asset') {
          const sourcePath = path.join(options.dir, fileName);
          const destPath = path.join(assetsDir, fileName);

          try {
            await fs.copyFile(sourcePath, destPath);
            console.log(`Copied ${fileName} to assets`);
          } catch (err) {
            console.error(`Failed to copy ${fileName}:`, err);
          }
        }
      }

      // Copy manifest.json and icon.svg if they exist
      const additionalFiles = ['manifest.json', 'icon.svg'];
      for (const file of additionalFiles) {
        try {
          const sourcePath = path.join(__dirname, file);
          const destPath = path.join(assetsDir, file);
          await fs.copyFile(sourcePath, destPath);
          console.log(`Copied ${file} to assets`);
        } catch (err) {
          // File might not exist, that's okay
        }
      }

      // Inline JS and CSS into HTML for watch mode
      const indexPath = path.join(options.dir, 'index.html');
      const destIndexPath = path.join(assetsDir, 'index.html');

      if (
        await fs
          .access(indexPath)
          .then(() => true)
          .catch(() => false)
      ) {
        let indexContent = await fs.readFile(indexPath, 'utf-8');

        // Find and inline JS
        const jsPath = path.join(options.dir, 'index.js');
        if (
          await fs
            .access(jsPath)
            .then(() => true)
            .catch(() => false)
        ) {
          const jsContent = await fs.readFile(jsPath, 'utf-8');
          indexContent = indexContent.replace(
            /<script\s+type="module"[^>]*\s+src=["']([^"']*index\.js)["'][^>]*><\/script>/i,
            `<script type="module">${jsContent}</script>`,
          );
        }

        // Find and inline CSS
        const cssPath = path.join(options.dir, 'index.css');
        if (
          await fs
            .access(cssPath)
            .then(() => true)
            .catch(() => false)
        ) {
          const cssContent = await fs.readFile(cssPath, 'utf-8');
          indexContent = indexContent.replace(
            /<link\s+rel="stylesheet"[^>]*\s+href=["']([^"']*index\.css)["'][^>]*\/?>/i,
            `<style>${cssContent}</style>`,
          );
        }

        // Save inlined version
        await fs.writeFile(destIndexPath, indexContent);
        console.log('✓ Inlined JS and CSS into index.html');
      }
    },
  };
};

export default defineConfig(({ command, mode }) => {
  const isWatch = process.argv.includes('--watch');

  return {
    plugins: [
      solidPlugin(),
      // Add the copy plugin in watch mode or development
      (isWatch || command === 'serve') && copyToAssetsPlugin(),
    ].filter(Boolean),
    base: './', // Use relative paths
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: {
          plugin: 'src/plugin.js',
          index: 'index.html',
        },
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js',
          assetFileNames: '[name].[ext]',
        },
      },
    },
  };
});
