#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';

const filesToMigrate = [
  'src/app/core/persistence/android-db-adapter.service.ts',
  'src/app/features/android/android-interface.ts',
  'src/app/features/android/store/android.effects.ts',
];

function migrateFile(filePath: string): void {
  console.log(`Processing ${filePath}...`);

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Replace Log.* method calls with DroidLog.*
  const logPattern = /\bLog\.(log|err|error|info|warn|debug|verbose|critical)\b/g;
  if (logPattern.test(content)) {
    content = content.replace(logPattern, 'DroidLog.$1');
    modified = true;
  }

  // Update imports
  if (modified) {
    // Check if file already imports from log
    if (
      content.includes("from '../../../../core/log'") ||
      content.includes('from "../../../core/log"') ||
      content.includes('from "../../core/log"') ||
      content.includes('from "../core/log"') ||
      content.includes("from '../../../../core/log'") ||
      content.includes("from '../../../core/log'") ||
      content.includes("from '../../core/log'") ||
      content.includes("from '../core/log'")
    ) {
      // Replace Log import with DroidLog
      content = content.replace(
        /import\s*{\s*([^}]*)\bLog\b([^}]*)\}\s*from\s*['"][^'"]*core\/log['"]/g,
        (match, before, after) => {
          const imports = (before + after)
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s && s !== 'Log');
          imports.push('DroidLog');
          return `import { ${imports.join(', ')} } from '${match.includes('"') ? match.split('"')[1] : match.split("'")[1]}'`;
        },
      );
    } else {
      console.log(`Warning: Could not find log import in ${filePath}`);
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✓ Migrated ${filePath}`);
  } else {
    console.log(`- No changes needed in ${filePath}`);
  }
}

// Process all files
filesToMigrate.forEach(migrateFile);

console.log('\nMigration complete!');
