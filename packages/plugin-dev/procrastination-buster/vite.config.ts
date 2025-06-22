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

      // Copy each file from the bundle
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
          plugin: 'src/plugin.ts',
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
