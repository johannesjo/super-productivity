#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const DOCUMENT_EXTENSIONS = new Set(['.md', '.markdown', '.html', '.htm']);
const EXTERNAL_TARGET = /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i;

const listDocuments = (rootDir) => {
  const documents = [];
  const pending = [rootDir];

  while (pending.length > 0) {
    const current = pending.pop();
    const entries = fs
      .readdirSync(current, { withFileTypes: true })
      .sort((a, b) => b.name.localeCompare(a.name));

    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        pending.push(entryPath);
      } else if (DOCUMENT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        documents.push(entryPath);
      }
    }
  }

  return documents.sort();
};

const cleanTarget = (target) => {
  const withoutFragment = target.split('#', 1)[0].split('?', 1)[0].trim();
  if (!withoutFragment) {
    return '';
  }

  try {
    return decodeURIComponent(withoutFragment);
  } catch {
    return withoutFragment;
  }
};

const pathCandidates = ({ sourceFile, target }) => {
  const cleaned = cleanTarget(target);
  if (!cleaned) {
    return [];
  }

  const baseDir = path.dirname(sourceFile);
  const resolved = cleaned.startsWith('/')
    ? path.resolve(process.cwd(), cleaned.slice(1))
    : path.resolve(baseDir, cleaned);
  const candidates = [resolved];

  if (!resolved.toLowerCase().endsWith('.md')) {
    candidates.push(`${resolved}.md`);
  }
  candidates.push(path.join(resolved, 'README.md'));

  return candidates;
};

const targetExists = ({ sourceFile, target }) => {
  if (!target || EXTERNAL_TARGET.test(target.trim())) {
    return true;
  }

  return pathCandidates({ sourceFile, target }).some((candidate) =>
    fs.existsSync(candidate),
  );
};

const linksFromLine = (line) => {
  const links = [];
  const withoutInlineCode = line.replace(/`+[^`]*`+/g, '');
  const markdownLink = /!?\[[^\]]*]\(\s*(?:<([^>]+)>|([^\s)]+))/g;
  const htmlLink = /(?:href|src)\s*=\s*["']([^"']+)["']/gi;
  const wikiLink = /\[\[([^\]]+)]]/g;

  for (const match of withoutInlineCode.matchAll(markdownLink)) {
    links.push({ target: match[1] || match[2] });
  }

  for (const match of withoutInlineCode.matchAll(wikiLink)) {
    const parts = match[1].split('|').map((part) => part.trim());
    if (parts.length > 1) {
      links.push({
        target: match[1].trim(),
        issue: 'unsupported wiki-link alias',
      });
      continue;
    }

    links.push({
      target: parts[0],
    });
  }

  for (const match of withoutInlineCode.matchAll(htmlLink)) {
    links.push({ target: match[1] });
  }

  return links;
};

const findBrokenLinks = (rootDir) => {
  const absoluteRoot = path.resolve(rootDir);
  const brokenLinks = [];

  for (const sourceFile of listDocuments(absoluteRoot)) {
    const lines = fs.readFileSync(sourceFile, 'utf8').split(/\r?\n/);
    let fenceMarker = null;

    lines.forEach((line, index) => {
      const fence = line.trimStart().match(/^(```+|~~~+)/)?.[1];
      if (fence) {
        if (!fenceMarker) {
          fenceMarker = fence[0];
        } else if (fence[0] === fenceMarker) {
          fenceMarker = null;
        }
        return;
      }

      if (fenceMarker) {
        return;
      }

      for (const link of linksFromLine(line)) {
        if (link.issue) {
          brokenLinks.push({
            file: path.relative(absoluteRoot, sourceFile),
            issue: link.issue,
            line: index + 1,
            target: link.target,
          });
          continue;
        }

        const exists = targetExists({
          sourceFile,
          target: link.target,
        });

        if (!exists) {
          brokenLinks.push({
            file: path.relative(absoluteRoot, sourceFile),
            line: index + 1,
            target: link.target,
          });
        }
      }
    });
  }

  return brokenLinks;
};

if (require.main === module) {
  const rootDir = process.argv[2] || 'docs';
  const brokenLinks = findBrokenLinks(rootDir);

  if (brokenLinks.length === 0) {
    console.log(`Documentation links are valid in ${rootDir}.`);
  } else {
    for (const link of brokenLinks) {
      const issue = link.issue || 'missing link target';
      console.error(`${link.file}:${link.line}: ${issue} "${link.target}"`);
    }
    process.exitCode = 1;
  }
}

module.exports = {
  findBrokenLinks,
};
