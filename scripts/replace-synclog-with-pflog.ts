#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as glob from 'glob';

const pfapiFiles = glob.sync('src/app/pfapi/**/*.ts', {
  ignore: ['**/*.spec.ts', '**/node_modules/**'],
});

console.log(`Found ${pfapiFiles.length} pfapi files to check`);

let totalFiles = 0;
let totalChanges = 0;

function migrateFile(filePath: string): void {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let localChanges = 0;

  // Replace SyncLog with PFLog in code
  const syncLogPattern = /\bSyncLog\b/g;
  const matches = content.match(syncLogPattern);
  if (matches) {
    content = content.replace(syncLogPattern, 'PFLog');
    modified = true;
    localChanges = matches.length;
  }

  // Update imports - replace SyncLog with PFLog
  if (modified) {
    // Handle imports that have both SyncLog and PFLog
    content = content.replace(
      /import\s*{\s*([^}]*)\bSyncLog\b([^}]*)\}\s*from\s*['"][^'"]*core\/log['"]/g,
      (match, before, after) => {
        const imports = (before + after)
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s && s !== 'SyncLog');
        // Only add PFLog if it's not already there
        if (!imports.includes('PFLog')) {
          imports.push('PFLog');
        }
        const importPath = match.includes('"')
          ? match.split('"')[1]
          : match.split("'")[1];
        return `import { ${imports.join(', ')} } from '${importPath}'`;
      },
    );
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✓ ${filePath} (${localChanges} changes)`);
    totalFiles++;
    totalChanges += localChanges;
  }
}

// Process all files
pfapiFiles.forEach(migrateFile);

console.log(
  `\nMigration complete! Modified ${totalFiles} files with ${totalChanges} total changes`,
);
