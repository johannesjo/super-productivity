#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
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

// Plugin configurations - only plugins that need npm install
const plugins = [
  {
    name: 'procrastination-buster',
    path: 'procrastination-buster',
    hasPackageJson: true,
  },
];

async function installPlugin(plugin) {
  const startTime = Date.now();
  log(`\n📦 Installing ${plugin.name}...`, colors.cyan);

  try {
    // Check if plugin directory exists
    if (!fs.existsSync(plugin.path)) {
      throw new Error(`Plugin directory not found: ${plugin.path}`);
    }

    // Check if package.json exists
    const packageJsonPath = path.join(plugin.path, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      log(`  Skipped - no package.json`, colors.yellow);
      return { plugin: plugin.name, success: true, skipped: true };
    }

    // Install dependencies
    log(`  Installing dependencies...`, colors.yellow);
    try {
      const { stdout, stderr } = await execAsync(`cd ${plugin.path} && npm install`);

      // Check if stderr contains actual errors (not just warnings)
      if (stderr && !stderr.includes('npm WARN') && !stderr.includes('vulnerabilities')) {
        // Check if installation actually failed by looking for node_modules
        const nodeModulesPath = path.join(plugin.path, 'node_modules');
        if (!fs.existsSync(nodeModulesPath)) {
          throw new Error(stderr);
        }
      }
    } catch (error) {
      // If the error message contains "Cannot set properties of null", try with --legacy-peer-deps
      if (error.message && error.message.includes('Cannot set properties of null')) {
        log(`  Retrying with --legacy-peer-deps...`, colors.yellow);
        await execAsync(`cd ${plugin.path} && npm install --legacy-peer-deps`);
      } else {
        throw error;
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    log(`✅ ${plugin.name} - Dependencies installed (${duration}s)`, colors.green);

    return { plugin: plugin.name, success: true, duration };
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    log(
      `❌ ${plugin.name} - Install failed: ${error.message} (${duration}s)`,
      colors.red,
    );

    return { plugin: plugin.name, success: false, error: error.message, duration };
  }
}

async function installAll() {
  log('\n🚀 Installing dependencies for all plugins...', colors.bright);
  const startTime = Date.now();

  // First install root dependencies
  log('\n📦 Installing root dependencies...', colors.cyan);
  try {
    await execAsync('npm install');
    log('✅ Root dependencies installed', colors.green);
  } catch (error) {
    log(`❌ Root install failed: ${error.message}`, colors.red);
    process.exit(1);
  }

  // Install plugin dependencies in parallel
  const results = await Promise.all(plugins.map(installPlugin));

  // Summary
  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
  const successful = results.filter((r) => r.success && !r.skipped).length;
  const skipped = results.filter((r) => r.skipped).length;
  const failed = results.filter((r) => !r.success).length;

  log('\n📊 Install Summary:', colors.bright);
  log(`  Total plugins: ${plugins.length}`);
  log(`  Successful: ${successful}`, colors.green);
  if (skipped > 0) {
    log(`  Skipped: ${skipped}`, colors.yellow);
  }
  if (failed > 0) {
    log(`  Failed: ${failed}`, colors.red);
  }
  log(`  Total time: ${totalDuration}s`);

  // List installed plugins
  log('\n📁 Installed plugins:', colors.bright);
  for (const result of results) {
    if (result.success && !result.skipped) {
      const nodeModulesPath = path.join(
        plugins.find((p) => p.name === result.plugin).path,
        'node_modules',
      );
      if (fs.existsSync(nodeModulesPath)) {
        const count = fs.readdirSync(nodeModulesPath).length;
        log(`  • ${result.plugin} (${count} packages)`);
      }
    }
  }

  if (failed > 0) {
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  installAll().catch((error) => {
    log(`\n❌ Install failed: ${error.message}`, colors.red);
    process.exit(1);
  });
}

module.exports = { installAll };
