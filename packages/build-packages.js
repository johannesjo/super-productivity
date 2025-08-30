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

// Plugin configurations
const plugins = [
  {
    name: 'plugin-api',
    path: 'packages/plugin-api',
    buildCommand: 'npm run build',
    skipCopy: true, // TypeScript definitions, no need to copy
  },
  {
    name: 'api-test-plugin',
    path: 'packages/plugin-dev/api-test-plugin',
    files: ['manifest.json', 'plugin.js', 'index.html'],
  },
  {
    name: 'procrastination-buster',
    path: 'packages/plugin-dev/procrastination-buster',
    buildCommand: 'npm run build',
    skipCopy: true, // inline-assets.js handles the copying with inlined assets
  },
  {
    name: 'yesterday-tasks-plugin',
    path: 'packages/plugin-dev/yesterday-tasks-plugin',
    files: ['manifest.json', 'plugin.js', 'index.html', 'icon.svg'],
  },
  {
    name: 'sync-md',
    path: 'packages/plugin-dev/sync-md',
    buildCommand: 'npm run build',
    distFiles: ['manifest.json', 'plugin.js', 'index.html', 'icon.svg'],
    sourcePath: 'dist',
  },
  {
    name: 'ai-productivity-prompts',
    path: 'packages/plugin-dev/ai-productivity-prompts',
    buildCommand: 'npm run build',
    skipCopy: true, // inline-assets.js handles the copying with inlined assets
  },
  // Explicitly excluding:
  // - boilerplate-solid-js
];

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
      log(`  ⚠️  Failed to copy ${path.basename(src)}: ${error.message}`, colors.yellow);
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

      const filesToCopy = plugin.distFiles || plugin.files || [];
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
