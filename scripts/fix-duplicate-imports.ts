#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

// Pattern to find duplicate imports
const findDuplicateImports = (content: string): string[] => {
  const importRegex = /^import\s+.*?;$/gm;
  const imports = content.match(importRegex) || [];
  const seen = new Set<string>();
  const duplicates: string[] = [];

  for (const imp of imports) {
    const normalized = imp.trim();
    if (seen.has(normalized)) {
      duplicates.push(normalized);
    } else {
      seen.add(normalized);
    }
  }

  return duplicates;
};

// Remove duplicate imports from content
const removeDuplicateImports = (content: string): string => {
  const lines = content.split('\n');
  const seenImports = new Set<string>();
  const resultLines: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Check if it's an import statement
    if (trimmedLine.startsWith('import ') && trimmedLine.endsWith(';')) {
      if (seenImports.has(trimmedLine)) {
        // Skip duplicate import
        continue;
      }
      seenImports.add(trimmedLine);
    }

    resultLines.push(line);
  }

  return resultLines.join('\n');
};

function processFile(filePath: string): boolean {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const duplicates = findDuplicateImports(content);

    if (duplicates.length > 0) {
      console.log(
        `Found ${duplicates.length} duplicate imports in ${path.relative(process.cwd(), filePath)}:`,
      );
      duplicates.forEach((dup) => console.log(`  - ${dup}`));

      const fixedContent = removeDuplicateImports(content);
      fs.writeFileSync(filePath, fixedContent, 'utf8');
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
    return false;
  }
}

function main() {
  console.log('Searching for duplicate imports...\n');

  const files = glob.sync('src/**/*.ts', {
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
    absolute: true,
  });

  let fixedCount = 0;

  for (const file of files) {
    if (processFile(file)) {
      fixedCount++;
    }
  }

  console.log(`\nFixed duplicate imports in ${fixedCount} files.`);
}

main();
