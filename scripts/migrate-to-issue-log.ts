#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

interface Replacement {
  pattern: RegExp;
  replacement: string;
}

const replacements: Replacement[] = [
  // Replace Log.log with IssueLog.log
  { pattern: /\bLog\.log\(/g, replacement: 'IssueLog.log(' },
  // Replace Log.err with IssueLog.err
  { pattern: /\bLog\.err\(/g, replacement: 'IssueLog.err(' },
  // Replace Log.info with IssueLog.info
  { pattern: /\bLog\.info\(/g, replacement: 'IssueLog.info(' },
  // Replace Log.debug with IssueLog.debug
  { pattern: /\bLog\.debug\(/g, replacement: 'IssueLog.debug(' },
  // Replace Log.verbose with IssueLog.verbose
  { pattern: /\bLog\.verbose\(/g, replacement: 'IssueLog.verbose(' },
  // Replace Log.critical with IssueLog.critical
  { pattern: /\bLog\.critical\(/g, replacement: 'IssueLog.critical(' },
];

function updateImports(content: string): string {
  // Check if file already imports IssueLog
  const hasIssueLogImport =
    /import\s*{[^}]*\bIssueLog\b[^}]*}\s*from\s*['"][^'"]*\/log['"]/.test(content);

  if (hasIssueLogImport) {
    // If IssueLog is already imported, just remove Log from the import if it's not used elsewhere
    return content;
  }

  // Find existing Log import and add IssueLog to it
  const logImportRegex = /import\s*{([^}]*\bLog\b[^}]*)}\s*from\s*(['"][^'"]*\/log['"])/;
  const match = content.match(logImportRegex);

  if (match) {
    const [fullMatch, imports, importPath] = match;
    const importList = imports.split(',').map((s) => s.trim());

    // Add IssueLog if not already there
    if (!importList.includes('IssueLog')) {
      importList.push('IssueLog');
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
  console.log('Migrating Log to IssueLog in features/issue directory...\n');

  // Find all TypeScript files in features/issue directory
  const files = glob.sync('src/app/features/issue/**/*.ts', {
    ignore: ['**/*.spec.ts', '**/node_modules/**'],
    absolute: true,
  });

  console.log(`Found ${files.length} TypeScript files in features/issue directory\n`);

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
