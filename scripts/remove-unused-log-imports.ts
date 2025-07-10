#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';

const filesToFix = [
  'src/app/features/calendar-integration/is-calender-event-due.ts',
  'src/app/features/schedule/map-schedule-data/create-sorted-blocker-blocks.ts',
  'src/app/features/schedule/map-schedule-data/create-view-entries-for-day.ts',
  'src/app/features/tasks/short-syntax.ts',
  'src/app/features/tasks/task-detail-panel/task-detail-panel.component.ts',
  'src/app/imex/sync/sync-trigger.service.ts',
  'src/app/pfapi/api/encryption/encryption.ts',
  'src/app/ui/stuck/stuck.directive.ts',
];

function removeUnusedLogImport(filePath: string): void {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    let content = fs.readFileSync(fullPath, 'utf8');

    // Check if Log is actually used in the file (excluding import statement and comments)
    const importRegex = /import\s+{[^}]*\bLog\b[^}]*}\s+from\s+['"][^'"]+['"]/g;
    let contentWithoutImports = content.replace(importRegex, '');

    // Remove single line comments
    contentWithoutImports = contentWithoutImports.replace(/\/\/.*$/gm, '');
    // Remove multi-line comments
    contentWithoutImports = contentWithoutImports.replace(/\/\*[\s\S]*?\*\//g, '');

    const isLogUsed = /\bLog\./g.test(contentWithoutImports);

    if (!isLogUsed) {
      // Remove Log from imports
      content = content.replace(
        /import\s+{([^}]*)\bLog\b([^}]*)}\s+from\s+(['"][^'"]+['"])/g,
        (match, before, after, path) => {
          // Clean up the remaining imports
          const remainingImports = (before + after)
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s && s !== 'Log')
            .join(', ');

          if (remainingImports) {
            return `import { ${remainingImports} } from ${path}`;
          } else {
            // If Log was the only import, remove the entire import line
            return '';
          }
        },
      );

      // Clean up any empty lines left by removed imports
      content = content.replace(/^\s*;\s*$/gm, ''); // Remove standalone semicolons
      content = content.replace(/\n\n+/g, '\n\n'); // Replace multiple newlines with double newline

      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`Fixed: ${filePath}`);
    } else {
      console.log(`Skipped (Log is used): ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
}

console.log('Removing unused Log imports...\n');

filesToFix.forEach(removeUnusedLogImport);

console.log('\nDone!');
