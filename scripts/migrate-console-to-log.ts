#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

interface Replacement {
  pattern: RegExp;
  replacement: string;
  logMethod: string;
}

const replacements: Replacement[] = [
  { pattern: /console\.log\(/g, replacement: 'Log.log(', logMethod: 'log' },
  { pattern: /console\.info\(/g, replacement: 'Log.info(', logMethod: 'info' },
  { pattern: /console\.error\(/g, replacement: 'Log.err(', logMethod: 'err' },
  { pattern: /console\.warn\(/g, replacement: 'Log.err(', logMethod: 'err' },
  { pattern: /console\.debug\(/g, replacement: 'Log.debug(', logMethod: 'debug' },
];

// Files to exclude
const excludePatterns = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/*.spec.ts',
  '**/core/log.ts',
  '**/scripts/migrate-console-to-log.ts',
  '**/e2e/**',
  '**/coverage/**',
  '**/.angular/**',
];

function calculateImportPath(filePath: string): string {
  const fileDir = path.dirname(filePath);
  const logPath = path.join(__dirname, '../src/app/core/log');
  let relativePath = path.relative(fileDir, logPath).replace(/\\/g, '/');

  // Remove .ts extension if present
  relativePath = relativePath.replace(/\.ts$/, '');

  // Ensure it starts with ./ or ../
  if (!relativePath.startsWith('.')) {
    relativePath = './' + relativePath;
  }

  return relativePath;
}

function hasLogImport(content: string): boolean {
  return /import\s+{[^}]*\bLog\b[^}]*}\s+from\s+['"].*\/log['"]/.test(content);
}

function addLogImport(content: string, importPath: string): string {
  // Find the last import statement
  const importRegex = /^import\s+.*?;$/gm;
  const imports = content.match(importRegex);

  if (imports && imports.length > 0) {
    const lastImport = imports[imports.length - 1];
    const lastImportIndex = content.lastIndexOf(lastImport);
    const insertPosition = lastImportIndex + lastImport.length;

    return (
      content.slice(0, insertPosition) +
      `\nimport { Log } from '${importPath}';` +
      content.slice(insertPosition)
    );
  } else {
    // No imports found, add at the beginning
    return `import { Log } from '${importPath}';\n\n` + content;
  }
}

function processFile(filePath: string): boolean {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let hasChanges = false;

    // Check if file uses any console methods
    const usesConsole = replacements.some((r) => r.pattern.test(content));

    if (!usesConsole) {
      return false;
    }

    // Apply replacements
    for (const { pattern, replacement } of replacements) {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        hasChanges = true;
      }
    }

    if (hasChanges && !hasLogImport(content)) {
      const importPath = calculateImportPath(filePath);
      content = addLogImport(content, importPath);
    }

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
    return false;
  }
}

function main() {
  console.log('Starting console to Log migration...\n');

  // Find all TypeScript files
  const files = glob.sync('src/**/*.ts', {
    ignore: excludePatterns,
    absolute: true,
  });

  console.log(`Found ${files.length} TypeScript files to check\n`);

  const modifiedFiles: string[] = [];
  const stats = {
    total: 0,
    log: 0,
    info: 0,
    error: 0,
    warn: 0,
    debug: 0,
  };

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');

    // Count occurrences before processing
    stats.log += (content.match(/console\.log\(/g) || []).length;
    stats.info += (content.match(/console\.info\(/g) || []).length;
    stats.error += (content.match(/console\.error\(/g) || []).length;
    stats.warn += (content.match(/console\.warn\(/g) || []).length;
    stats.debug += (content.match(/console\.debug\(/g) || []).length;

    if (processFile(file)) {
      modifiedFiles.push(file);
    }
  }

  stats.total = stats.log + stats.info + stats.error + stats.warn + stats.debug;

  console.log('Migration complete!\n');
  console.log('Statistics:');
  console.log(`  Total console calls found: ${stats.total}`);
  console.log(`  - console.log: ${stats.log}`);
  console.log(`  - console.info: ${stats.info}`);
  console.log(`  - console.error: ${stats.error}`);
  console.log(`  - console.warn: ${stats.warn}`);
  console.log(`  - console.debug: ${stats.debug}`);
  console.log(`\nModified ${modifiedFiles.length} files:`);

  modifiedFiles.forEach((file) => {
    console.log(`  - ${path.relative(process.cwd(), file)}`);
  });

  if (modifiedFiles.length === 0) {
    console.log('  No files needed modification.');
  }
}

// Run the migration
main();
