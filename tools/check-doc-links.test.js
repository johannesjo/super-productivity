const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { findBrokenLinks } = require('./check-doc-links');

const withDocs = (files, run) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-doc-links-'));

  try {
    for (const [relativePath, contents] of Object.entries(files)) {
      const filePath = path.join(root, relativePath);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, contents);
    }

    run(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
};

test('accepts existing Markdown, image, HTML, and wiki links', () => {
  withDocs(
    {
      'index.md': [
        '[Guide](guide.md#usage)',
        '![Screenshot](images/example.png)',
        '<a href="nested/page.html">Details</a>',
        '[[Wiki-Page]]',
      ].join('\n'),
      'guide.md': '# Guide',
      'Wiki-Page.md': '# Wiki page',
      'nested/page.html': '<h1>Details</h1>',
      'images/example.png': '',
    },
    (root) => {
      assert.deepEqual(findBrokenLinks(root), []);
    },
  );
});

test('reports missing local and wiki targets with source lines', () => {
  withDocs(
    {
      'index.md': ['# Index', '[Missing](missing.md)', '[[Missing-Wiki]]'].join('\n'),
    },
    (root) => {
      assert.deepEqual(findBrokenLinks(root), [
        {
          file: 'index.md',
          line: 2,
          target: 'missing.md',
        },
        {
          file: 'index.md',
          line: 3,
          target: 'Missing-Wiki',
        },
      ]);
    },
  );
});

test('ignores external, fragment-only, inline-code, and fenced-code links', () => {
  withDocs(
    {
      'index.md': [
        '[Website](https://example.com)',
        '[Email](mailto:test@example.com)',
        '[Section](#section)',
        '`[Example](not-real.md)`',
        '```markdown',
        '[Example](also-not-real.md)',
        '[[Example-Wiki]]',
        '```',
      ].join('\n'),
    },
    (root) => {
      assert.deepEqual(findBrokenLinks(root), []);
    },
  );
});

test('decodes URL-encoded paths and accepts extensionless Markdown targets', () => {
  withDocs(
    {
      'index.md': ['[With spaces](A%20Guide.md)', '[Extensionless](Other)'].join('\n'),
      'A Guide.md': '# Guide',
      'Other.md': '# Other',
    },
    (root) => {
      assert.deepEqual(findBrokenLinks(root), []);
    },
  );
});

test('resolves wiki links from the source document directory', () => {
  withDocs(
    {
      'wiki/index.md': [
        '[[Guide]]',
        '[[1.01-Dotted-Guide]]',
        '[[assets/example.png]]',
      ].join('\n'),
      'wiki/Guide.md': '# Guide',
      'wiki/1.01-Dotted-Guide.md': '# Dotted guide',
      'wiki/assets/example.png': '',
    },
    (root) => {
      assert.deepEqual(findBrokenLinks(root), []);
    },
  );
});

test('rejects unsupported wiki-link aliases', () => {
  withDocs(
    {
      'wiki/index.md': ['[[Readable label|Guide]]', '[[Guide|Missing]]'].join('\n'),
      'wiki/Guide.md': '# Guide',
    },
    (root) => {
      assert.deepEqual(findBrokenLinks(root), [
        {
          file: 'wiki/index.md',
          issue: 'unsupported wiki-link alias',
          line: 1,
          target: 'Readable label|Guide',
        },
        {
          file: 'wiki/index.md',
          issue: 'unsupported wiki-link alias',
          line: 2,
          target: 'Guide|Missing',
        },
      ]);
    },
  );
});
