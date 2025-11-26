import { Plugin, UserConfig } from 'vite';
import path from 'path';
import fs from 'fs';

export interface SuperProductivityPluginOptions {
  /**
   * Whether to inline assets (JS/CSS) into index.html.
   * Useful for plugins with UI that need to be single-file.
   * Default: true
   */
  inlineAssets?: boolean;
}

export function superProductivityPlugin(
  options: SuperProductivityPluginOptions = {},
): Plugin {
  const { inlineAssets = true } = options;
  let config: UserConfig;

  return {
    name: 'super-productivity-plugin',
    config(userConfig) {
      config = userConfig;
      return {
        build: {
          outDir: 'dist',
          emptyOutDir: true,
          rollupOptions: {
            input: {
              // We try to detect input files, but user can override
              plugin: path.resolve(process.cwd(), 'src/plugin.ts'),
              ...(fs.existsSync(path.resolve(process.cwd(), 'src/index.html'))
                ? { index: path.resolve(process.cwd(), 'src/index.html') }
                : {}),
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
      };
    },
    closeBundle: {
      order: 'post',
      handler() {
        const distDir = path.resolve(process.cwd(), 'dist');

        // 1. Copy manifest.json
        const manifestSrc = path.resolve(process.cwd(), 'src/manifest.json');
        const manifestDest = path.join(distDir, 'manifest.json');
        if (fs.existsSync(manifestSrc)) {
          fs.copyFileSync(manifestSrc, manifestDest);
        }

        // 2. Copy icon.svg
        const iconSrc = path.resolve(process.cwd(), 'src/assets/icon.svg');
        const iconDest = path.join(distDir, 'icon.svg');
        if (fs.existsSync(iconSrc)) {
          // Ensure dist exists (it should after build)
          if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
          fs.copyFileSync(iconSrc, iconDest);
        }

        // 3. Handle index.html and inlining
        const htmlPath = path.join(distDir, 'index.html');

        // Sometimes Vite outputs index.html in dist/src/index.html depending on input config
        // Let's try to find it and move it to root if needed
        const nestedHtmlPath = path.join(distDir, 'src/index.html');
        if (fs.existsSync(nestedHtmlPath) && !fs.existsSync(htmlPath)) {
          fs.renameSync(nestedHtmlPath, htmlPath);
          // Try to remove the src directory if empty or just contains html
          try {
            fs.rmSync(path.join(distDir, 'src'), { recursive: true, force: true });
          } catch (e) {
            // ignore
          }
        }

        if (inlineAssets && fs.existsSync(htmlPath)) {
          let html = fs.readFileSync(htmlPath, 'utf8');
          const jsPath = path.join(distDir, 'index.js');
          const cssPath = path.join(distDir, 'index.css');

          // Inline JS
          if (fs.existsSync(jsPath)) {
            const js = fs.readFileSync(jsPath, 'utf8');
            html = html.replace(
              /<script([^>]*)src="[^"]*index\.js"[^>]*><\/script>/g,
              (match, attrs) => {
                if (attrs.includes('type="module"') || match.includes('type="module"')) {
                  return `<script type="module">${js}</script>`;
                }
                return `<script>${js}</script>`;
              },
            );
            // Also handle module preload links which might be generated
            html = html.replace(/<link rel="modulepreload" href="[^"]*index\.js">/g, '');
          }

          // Inline CSS
          if (fs.existsSync(cssPath)) {
            const css = fs.readFileSync(cssPath, 'utf8');
            html = html.replace(
              /<link[^>]*rel="stylesheet"[^>]*href="[^"]*index\.css"[^>]*>/g,
              `<style>${css}</style>`,
            );
          }

          fs.writeFileSync(htmlPath, html);
          console.log('✅ Assets inlined successfully');
        }
      },
    },
  };
}
