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
  { pattern: /\bconsole\.log\(/g, replacement: 'Log.log(', logMethod: 'log' },
  { pattern: /\bconsole\.info\(/g, replacement: 'Log.info(', logMethod: 'info' },
  { pattern: /\bconsole\.error\(/g, replacement: 'Log.err(', logMethod: 'err' },
  { pattern: /\bconsole\.warn\(/g, replacement: 'Log.err(', logMethod: 'err' },
  { pattern: /\bconsole\.debug\(/g, replacement: 'Log.debug(', logMethod: 'debug' },
];

// Files to exclude
const excludePatterns = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/*.spec.ts',
  '**/core/log.ts',
  '**/scripts/migrate-console-to-log*.ts',
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
  // Check if there's already a Log import from core/log
  return /import\s+{[^}]*\bLog\b[^}]*}\s+from\s+['"][^'"]*\/core\/log['"]/.test(content);
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

function processFile(
  filePath: string,
  dryRun: boolean = false,
): { modified: boolean; changes: number } {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let changeCount = 0;

    // Apply replacements - this will replace even in comments, which is what we want
    for (const { pattern, replacement } of replacements) {
      const matches = content.match(pattern);
      if (matches) {
        changeCount += matches.length;
        content = content.replace(pattern, replacement);
      }
    }

    // If we made changes and don't have the correct Log import, add it
    if (changeCount > 0 && !hasLogImport(content)) {
      const importPath = calculateImportPath(filePath);
      content = addLogImport(content, importPath);
    }

    const modified = content !== originalContent;

    if (modified && !dryRun) {
      fs.writeFileSync(filePath, content, 'utf8');
    }

    return { modified, changes: changeCount };
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
    return { modified: false, changes: 0 };
  }
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('Starting FORCED console to Log migration...');
  console.log('This will replace ALL console.* calls, including those in comments.');
  if (dryRun) {
    console.log('Running in DRY RUN mode - no files will be modified\n');
  }

  // Find all TypeScript files
  const files = glob.sync('src/**/*.ts', {
    ignore: excludePatterns,
    absolute: true,
  });

  console.log(`Found ${files.length} TypeScript files to check\n`);

  const modifiedFiles: { path: string; changes: number }[] = [];
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

    // Count occurrences before processing (with word boundary)
    const logCount = (content.match(/\bconsole\.log\(/g) || []).length;
    const infoCount = (content.match(/\bconsole\.info\(/g) || []).length;
    const errorCount = (content.match(/\bconsole\.error\(/g) || []).length;
    const warnCount = (content.match(/\bconsole\.warn\(/g) || []).length;
    const debugCount = (content.match(/\bconsole\.debug\(/g) || []).length;

    stats.log += logCount;
    stats.info += infoCount;
    stats.error += errorCount;
    stats.warn += warnCount;
    stats.debug += debugCount;

    const result = processFile(file, dryRun);
    if (result.modified) {
      modifiedFiles.push({ path: file, changes: result.changes });
    }
  }

  stats.total = stats.log + stats.info + stats.error + stats.warn + stats.debug;

  console.log('\nMigration complete!\n');
  console.log('Statistics:');
  console.log(`  Total console calls found: ${stats.total}`);
  console.log(`  - console.log: ${stats.log}`);
  console.log(`  - console.info: ${stats.info}`);
  console.log(`  - console.error: ${stats.error}`);
  console.log(`  - console.warn: ${stats.warn}`);
  console.log(`  - console.debug: ${stats.debug}`);
  console.log(
    `\n${dryRun ? 'Would modify' : 'Modified'} ${modifiedFiles.length} files:\n`,
  );

  modifiedFiles
    .sort((a, b) => b.changes - a.changes)
    .forEach(({ path: filePath, changes }) => {
      console.log(`  - ${path.relative(process.cwd(), filePath)} (${changes} changes)`);
    });

  if (modifiedFiles.length === 0) {
    console.log('  No files needed modification.');
  }
}

// Run the migration
main();
