const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  checkDocLinks,
  findBrokenLinks,
  MAX_DIAGNOSTICS,
  MAX_DOCUMENT_BYTES,
  MAX_LINE_LENGTH,
} = require('./check-doc-links');

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
        '# Index',
        '## Current section',
        '[Guide](guide.md#usage)',
        '[Current section](#current-section)',
        '![Screenshot](images/example.png)',
        '<a href="nested/page.html#details">Details</a>',
        '[[Wiki-Page]]',
      ].join('\n'),
      'guide.md': ['# Guide', '## Usage'].join('\n'),
      'Wiki-Page.md': '# Wiki page',
      'nested/page.html': '<h1 id="details">Details</h1>',
      'images/example.png': '',
    },
    (root) => {
      assert.deepEqual(findBrokenLinks(root), []);
    },
  );
});

test('reports missing Markdown and HTML anchors', () => {
  withDocs(
    {
      'index.md': [
        '# Index',
        '[Wrong heading](guide.md#installation)',
        '<a href="nested/page.html#missing">Missing HTML anchor</a>',
        '[Wrong current heading](#missing-current-heading)',
      ].join('\n'),
      'guide.md': ['# Guide', '## Usage'].join('\n'),
      'nested/page.html': '<h1 id="details">Details</h1>',
    },
    (root) => {
      assert.deepEqual(findBrokenLinks(root), [
        {
          file: 'index.md',
          issue: 'missing anchor',
          line: 2,
          target: 'guide.md#installation',
        },
        {
          file: 'index.md',
          issue: 'missing anchor',
          line: 3,
          target: 'nested/page.html#missing',
        },
        {
          file: 'index.md',
          issue: 'missing anchor',
          line: 4,
          target: '#missing-current-heading',
        },
      ]);
    },
  );
});

test('matches rendered heading text and resolves cross-slug collisions', () => {
  withDocs(
    {
      'index.md': [
        '[Rendered link heading](guide.md#setup)',
        '[Balanced destination](guide.md#advanced-setup)',
        '[Emphasized heading](guide.md#emphasized-setup)',
        '[Strong heading](guide.md#strong-setup)',
        '[Literal underscores](guide.md#literal_under_score)',
        '[Duplicate collision](guide.md#foo-1-1)',
      ].join('\n'),
      'guide.md': [
        '# [Setup](setup.md)',
        '# [Advanced setup](https://example.com/a_(b)_tail)',
        '# _Emphasized setup_',
        '# __Strong setup__',
        '# literal_under_score',
        '## Foo',
        '## Foo',
        '## Foo-1',
        '',
        '[Setup target](setup.md)',
      ].join('\n'),
      'setup.md': '# Setup target',
    },
    (root) => {
      assert.deepEqual(findBrokenLinks(root), []);
    },
  );
});

test('ignores apparent HTML anchors in code, comments, and unrelated attributes', () => {
  withDocs(
    {
      'index.md': [
        '[Fenced](guide.md#fenced)',
        '[Commented](guide.md#commented)',
        '[Data attribute](guide.md#data-value)',
        '[Named div](guide.md#named-div)',
        '[Real ID](guide.md#real-id)',
        '[Legacy anchor](guide.md#legacy-anchor)',
      ].join('\n'),
      'guide.md': [
        '# Guide',
        '```html',
        '<div id="fenced"></div>',
        '```',
        '<!-- <div id="commented"></div> -->',
        '<div data-id="data-value" name="named-div"></div>',
        '<section id="real-id"></section>',
        '<a name="legacy-anchor"></a>',
      ].join('\n'),
    },
    (root) => {
      assert.deepEqual(findBrokenLinks(root), [
        {
          file: 'index.md',
          issue: 'missing anchor',
          line: 1,
          target: 'guide.md#fenced',
        },
        {
          file: 'index.md',
          issue: 'missing anchor',
          line: 2,
          target: 'guide.md#commented',
        },
        {
          file: 'index.md',
          issue: 'missing anchor',
          line: 3,
          target: 'guide.md#data-value',
        },
        {
          file: 'index.md',
          issue: 'missing anchor',
          line: 4,
          target: 'guide.md#named-div',
        },
      ]);
    },
  );
});

test('ignores anchors and links inside longer Markdown fences', () => {
  withDocs(
    {
      'index.md': '[Fake anchor](guide.md#fake)',
      'guide.md': [
        '# Guide',
        '````html',
        '```',
        '<div id="fake"></div>',
        '[Missing](missing.md)',
        '````',
      ].join('\n'),
    },
    (root) => {
      assert.deepEqual(findBrokenLinks(root), [
        {
          file: 'index.md',
          issue: 'missing anchor',
          line: 1,
          target: 'guide.md#fake',
        },
      ]);
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

test('accepts multiple document file inputs', () => {
  withDocs(
    {
      'first.md': '[Guide](guide.md)',
      'guide.md': '# Guide',
      'second.md': '[Missing](missing.md)',
    },
    (root) => {
      assert.deepEqual(
        findBrokenLinks([
          path.join(root, 'first.md'),
          path.join(root, 'deleted.md'),
          path.join(root, 'second.md'),
        ]),
        [
          {
            file: 'second.md',
            line: 1,
            target: 'missing.md',
          },
        ],
      );
    },
  );
});

test('ignores external, inline-code, and fenced-code links', () => {
  withDocs(
    {
      'index.md': [
        '# Section',
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

test('keeps local targets inside the repository boundary', () => {
  withDocs(
    {
      'index.md': [
        '[Root link](/guide.md)',
        '[Escape](../outside.md)',
        '[Symlink escape](linked.md)',
      ].join('\n'),
      'guide.md': '# Guide',
    },
    (root) => {
      fs.symlinkSync('/dev/null', path.join(root, 'linked.md'));

      assert.deepEqual(findBrokenLinks(root), [
        {
          file: 'index.md',
          issue: 'link target escapes repository',
          line: 2,
          target: '../outside.md',
        },
        {
          file: 'index.md',
          issue: 'link target escapes repository',
          line: 3,
          target: 'linked.md',
        },
      ]);
    },
  );
});

test('does not follow symlinked document sources', () => {
  withDocs(
    {
      'index.md': '# Index',
      'linked-source.txt': '[Missing](missing.md)',
    },
    (root) => {
      fs.symlinkSync('linked-source.txt', path.join(root, 'linked-source.md'));

      assert.deepEqual(findBrokenLinks(root), []);
    },
  );
});

test('rejects oversized documents and lines', () => {
  withDocs(
    {
      'long-line.md': 'x'.repeat(MAX_LINE_LENGTH + 1),
      'oversized.md': 'x'.repeat(MAX_DOCUMENT_BYTES + 1),
    },
    (root) => {
      assert.deepEqual(findBrokenLinks(root), [
        {
          file: 'long-line.md',
          issue: `line exceeds ${MAX_LINE_LENGTH} character limit`,
          line: 1,
          target: '',
        },
        {
          file: 'oversized.md',
          issue: `document exceeds ${MAX_DOCUMENT_BYTES} byte limit`,
          line: 1,
          target: '',
        },
      ]);
    },
  );
});

test('caps diagnostics while preserving the total problem count', () => {
  const missingLinks = Array.from(
    { length: MAX_DIAGNOSTICS + 5 },
    (_, index) => `[Missing ${index}](missing-${index}.md)`,
  ).join('\n');

  withDocs({ 'index.md': missingLinks }, (root) => {
    const result = checkDocLinks(root);

    assert.equal(result.brokenLinks.length, MAX_DIAGNOSTICS);
    assert.equal(result.total, MAX_DIAGNOSTICS + 5);
  });
});

test('handles a bounded line of unmatched link openers', () => {
  withDocs(
    {
      'index.md': '['.repeat(MAX_LINE_LENGTH),
    },
    (root) => {
      assert.deepEqual(findBrokenLinks(root), []);
    },
  );
});
