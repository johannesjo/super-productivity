#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = '') {
  console.log(`${color}${message}${colors.reset}`);
}

async function getPlugins() {
  const pluginDevDir = path.join(__dirname, 'plugin-dev');
  const entries = await fs.readdir(pluginDevDir, { withFileTypes: true });

  const plugins = [];

  // Add plugin-api first as it's a dependency
  plugins.push({
    name: 'plugin-api',
    path: 'packages/plugin-api',
    buildCommand: 'npm run build',
    skipCopy: true,
  });

  // Add vite-plugin second as it's a build dependency
  plugins.push({
    name: 'vite-plugin',
    path: 'packages/vite-plugin',
    buildCommand: 'npm run build',
    skipCopy: true,
  });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const pluginPath = path.join(pluginDevDir, entry.name);
      const packageJsonPath = path.join(pluginPath, 'package.json');

      try {
        await fs.access(packageJsonPath);
        // It's a valid package

        // Skip boilerplate
        if (entry.name === 'boilerplate-solid-js') continue;

        plugins.push({
          name: entry.name,
          path: `packages/plugin-dev/${entry.name}`,
          buildCommand: 'npm run build',
          // Standard files to copy for bundled plugins
          files: ['manifest.json', 'plugin.js', 'index.html', 'icon.svg'],
          sourcePath: 'dist',
        });
      } catch (e) {
        // Not a package, skip
      }
    }
  }

  return plugins;
}

async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
}

async function copyFile(src, dest) {
  try {
    await fs.copyFile(src, dest);
    return true;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      // Only log if it's not a "file not found" error, as some plugins might not have all assets
      // e.g. no index.html or icon.svg
      // But for bundled plugins we generally expect them.
      // Let's be silent about ENOENT for optional files
    }
    return false;
  }
}

async function buildPlugin(plugin) {
  const startTime = Date.now();
  log(`\n📦 Processing ${plugin.name}...`, colors.cyan);

  try {
    // Check if plugin directory exists
    const pluginPath = path.resolve(plugin.path);
    try {
      await fs.access(pluginPath);
    } catch {
      throw new Error(`Plugin directory not found: ${plugin.path}`);
    }

    // Run build command if specified
    if (plugin.buildCommand) {
      log(`  Building...`, colors.yellow);
      const packageJsonPath = path.join(pluginPath, 'package.json');

      // Check if package.json exists and install dependencies if needed
      try {
        await fs.access(packageJsonPath);
        const nodeModulesPath = path.join(pluginPath, 'node_modules');
        try {
          await fs.access(nodeModulesPath);
        } catch {
          log(`  Installing dependencies...`, colors.yellow);
          await execAsync(`cd ${pluginPath} && npm install`);
        }
      } catch {
        // No package.json, skip install
      }

      await execAsync(`cd ${pluginPath} && ${plugin.buildCommand}`);
    }

    // Copy files to assets if not skipped
    if (!plugin.skipCopy) {
      const targetDir = path.join('src/assets/bundled-plugins', plugin.name);
      await ensureDir(targetDir);

      const filesToCopy = plugin.files || [];
      const sourcePath = plugin.sourcePath
        ? path.join(pluginPath, plugin.sourcePath)
        : pluginPath;

      let copiedCount = 0;
      for (const file of filesToCopy) {
        const src = path.join(sourcePath, file);
        const dest = path.join(targetDir, file);
        if (await copyFile(src, dest)) {
          copiedCount++;
        }
      }

      log(
        `  ✅ Copied ${copiedCount}/${filesToCopy.length} files to assets`,
        colors.green,
      );
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    log(`✅ ${plugin.name} completed (${duration}s)`, colors.green);

    return { plugin: plugin.name, success: true, duration };
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    log(`❌ ${plugin.name} failed: ${error.message} (${duration}s)`, colors.red);
    return { plugin: plugin.name, success: false, error: error.message, duration };
  }
}

async function buildAll() {
  log('🚀 Building all packages...', colors.bright);
  const startTime = Date.now();

  const plugins = await getPlugins();

  // Build plugins sequentially to avoid conflicts
  const results = [];
  for (const plugin of plugins) {
    const result = await buildPlugin(plugin);
    results.push(result);
  }

  // Summary
  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  log('\n📊 Build Summary:', colors.bright);
  log(`  Total packages: ${plugins.length}`);
  log(`  Successful: ${successful}`, colors.green);
  if (failed > 0) {
    log(`  Failed: ${failed}`, colors.red);
    results
      .filter((r) => !r.success)
      .forEach((r) => {
        log(`    - ${r.plugin}: ${r.error}`, colors.red);
      });
  }
  log(`  Total time: ${totalDuration}s`);

  if (failed > 0) {
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  buildAll().catch((error) => {
    log(`\n❌ Build failed: ${error.message}`, colors.red);
    process.exit(1);
  });
}

module.exports = { buildAll };
