#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

const taskFiles = glob.sync('src/app/features/tasks/**/*.ts', {
  ignore: ['**/*.spec.ts', '**/node_modules/**'],
});

console.log(`Found ${taskFiles.length} task files to check`);

let totalChanges = 0;

function getRelativeImportPath(fromFile: string, toFile: string): string {
  const fromDir = path.dirname(fromFile);
  let relativePath = path.relative(fromDir, toFile).replace(/\\/g, '/');
  if (!relativePath.startsWith('.')) {
    relativePath = './' + relativePath;
  }
  return relativePath.replace(/\.ts$/, '');
}

function migrateFile(filePath: string): void {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let localChanges = 0;

  // Skip if file already uses TaskLog
  if (content.includes('TaskLog')) {
    return;
  }

  // Replace console.* calls
  const consolePatterns = [
    { pattern: /\bconsole\.log\(/g, replacement: 'TaskLog.log(' },
    { pattern: /\bconsole\.error\(/g, replacement: 'TaskLog.err(' },
    { pattern: /\bconsole\.info\(/g, replacement: 'TaskLog.info(' },
    { pattern: /\bconsole\.warn\(/g, replacement: 'TaskLog.warn(' },
    { pattern: /\bconsole\.debug\(/g, replacement: 'TaskLog.debug(' },
  ];

  for (const { pattern, replacement } of consolePatterns) {
    const matches = content.match(pattern);
    if (matches) {
      content = content.replace(pattern, replacement);
      modified = true;
      localChanges += matches.length;
    }
  }

  // Replace Log.* method calls with TaskLog.*
  const logPattern = /\bLog\.(log|err|error|info|warn|debug|verbose|critical)\b/g;
  const logMatches = content.match(logPattern);
  if (logMatches) {
    content = content.replace(logPattern, 'TaskLog.$1');
    modified = true;
    localChanges += logMatches.length;
  }

  // Update imports
  if (modified) {
    const logPath = getRelativeImportPath(filePath, 'src/app/core/log.ts');

    // Check if file already imports from log
    const importRegex = new RegExp(
      `import\\s*{([^}]*)}\\s*from\\s*['"]${logPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`,
    );
    const existingImport = content.match(importRegex);

    if (existingImport) {
      // Update existing import
      const imports = existingImport[1]
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s && s !== 'Log');
      if (!imports.includes('TaskLog')) {
        imports.push('TaskLog');
      }
      content = content.replace(
        importRegex,
        `import { ${imports.join(', ')} } from '${logPath}'`,
      );
    } else {
      // Check for any Log import
      const anyLogImport = content.match(
        /import\s*{\s*([^}]*)\bLog\b([^}]*)\}\s*from\s*['"][^'"]*core\/log['"]/,
      );
      if (anyLogImport) {
        // Replace with TaskLog
        content = content.replace(
          /import\s*{\s*([^}]*)\bLog\b([^}]*)\}\s*from\s*['"][^'"]*core\/log['"]/g,
          (match, before, after) => {
            const imports = (before + after)
              .split(',')
              .map((s) => s.trim())
              .filter((s) => s && s !== 'Log');
            imports.push('TaskLog');
            const importPath = match.includes('"')
              ? match.split('"')[1]
              : match.split("'")[1];
            return `import { ${imports.join(', ')} } from '${importPath}'`;
          },
        );
      } else if (!content.includes('TaskLog')) {
        // Add new import at the top
        const importStatement = `import { TaskLog } from '${logPath}';\n`;

        // Find the right place to insert the import
        const firstImportMatch = content.match(/^import\s+/m);
        if (firstImportMatch) {
          const position = firstImportMatch.index!;
          content =
            content.slice(0, position) + importStatement + content.slice(position);
        } else {
          // If no imports, add after any leading comments
          const afterComments = content.match(/^(\/\*[\s\S]*?\*\/|\/\/.*$)*/m);
          if (afterComments) {
            const position = afterComments[0].length;
            content =
              content.slice(0, position) +
              (position > 0 ? '\n' : '') +
              importStatement +
              content.slice(position);
          } else {
            content = importStatement + content;
          }
        }
      }
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✓ ${filePath} (${localChanges} changes)`);
    totalChanges += localChanges;
  }
}

// Process all files
taskFiles.forEach(migrateFile);

console.log(`\nMigration complete! Total changes: ${totalChanges}`);
