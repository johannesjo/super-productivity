#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

interface Replacement {
  pattern: RegExp;
  replacement: string;
}

const replacements: Replacement[] = [
  // Replace Log.log with PluginLog.log
  { pattern: /\bLog\.log\(/g, replacement: 'PluginLog.log(' },
  // Replace Log.err with PluginLog.err
  { pattern: /\bLog\.err\(/g, replacement: 'PluginLog.err(' },
  // Replace Log.info with PluginLog.info
  { pattern: /\bLog\.info\(/g, replacement: 'PluginLog.info(' },
  // Replace Log.debug with PluginLog.debug
  { pattern: /\bLog\.debug\(/g, replacement: 'PluginLog.debug(' },
  // Replace Log.verbose with PluginLog.verbose
  { pattern: /\bLog\.verbose\(/g, replacement: 'PluginLog.verbose(' },
  // Replace Log.critical with PluginLog.critical
  { pattern: /\bLog\.critical\(/g, replacement: 'PluginLog.critical(' },
];

function updateImports(content: string): string {
  // Check if file already imports PluginLog
  const hasPluginLogImport =
    /import\s*{[^}]*\bPluginLog\b[^}]*}\s*from\s*['"][^'"]*\/log['"]/.test(content);

  if (hasPluginLogImport) {
    // If PluginLog is already imported, just remove Log from the import if it's not used elsewhere
    return content;
  }

  // Find existing Log import and add PluginLog to it
  const logImportRegex = /import\s*{([^}]*\bLog\b[^}]*)}\s*from\s*(['"][^'"]*\/log['"])/;
  const match = content.match(logImportRegex);

  if (match) {
    const [fullMatch, imports, importPath] = match;
    const importList = imports.split(',').map((s) => s.trim());

    // Add PluginLog if not already there
    if (!importList.includes('PluginLog')) {
      importList.push('PluginLog');
    }

    // Check if Log is still used after replacements
    let tempContent = content;
    for (const { pattern, replacement } of replacements) {
      tempContent = tempContent.replace(pattern, replacement);
    }

    // Remove the import statement from check
    tempContent = tempContent.replace(logImportRegex, '');

    // If Log is no longer used, remove it from imports
    const logStillUsed = /\bLog\b/.test(tempContent);
    if (!logStillUsed) {
      const logIndex = importList.indexOf('Log');
      if (logIndex > -1) {
        importList.splice(logIndex, 1);
      }
    }

    const newImports = importList.join(', ');
    const newImportStatement = `import { ${newImports} } from ${importPath}`;
    content = content.replace(fullMatch, newImportStatement);
  }

  return content;
}

function processFile(filePath: string): { modified: boolean; changes: number } {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let changeCount = 0;

    // Count and apply replacements
    for (const { pattern, replacement } of replacements) {
      const matches = content.match(pattern);
      if (matches) {
        changeCount += matches.length;
        content = content.replace(pattern, replacement);
      }
    }

    // Update imports if changes were made
    if (changeCount > 0) {
      content = updateImports(content);
    }

    const modified = content !== originalContent;

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
    }

    return { modified, changes: changeCount };
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
    return { modified: false, changes: 0 };
  }
}

function main() {
  console.log('Migrating Log to PluginLog in plugins directory...\n');

  // Find all TypeScript files in plugins directory
  const files = glob.sync('src/app/plugins/**/*.ts', {
    ignore: ['**/*.spec.ts', '**/node_modules/**'],
    absolute: true,
  });

  console.log(`Found ${files.length} TypeScript files in plugins directory\n`);

  const modifiedFiles: { path: string; changes: number }[] = [];
  let totalChanges = 0;

  for (const file of files) {
    const result = processFile(file);
    if (result.modified) {
      modifiedFiles.push({ path: file, changes: result.changes });
      totalChanges += result.changes;
    }
  }

  console.log('\nMigration complete!\n');
  console.log(`Total changes: ${totalChanges}`);
  console.log(`Modified ${modifiedFiles.length} files:\n`);

  modifiedFiles
    .sort((a, b) => b.changes - a.changes)
    .forEach(({ path: filePath, changes }) => {
      console.log(`  - ${path.relative(process.cwd(), filePath)} (${changes} changes)`);
    });

  if (modifiedFiles.length === 0) {
    console.log('  No files needed modification.');
  }
}

main();
