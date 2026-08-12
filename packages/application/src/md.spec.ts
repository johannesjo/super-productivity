import { describe, expect, it } from 'vitest';
import { markdownPreview, renderMarkdown } from './md';

describe('renderMarkdown', () => {
  it('renders headings and paragraphs', () => {
    expect(renderMarkdown('# Hello\n\nWorld')).toBe('<h1>Hello</h1>\n<p>World</p>');
  });

  it('renders bullet and ordered lists', () => {
    expect(renderMarkdown('- one\n- two')).toBe(
      '<ul>\n<li>one</li>\n<li>two</li>\n</ul>',
    );
    expect(renderMarkdown('1. a\n2. b')).toBe('<ol>\n<li>a</li>\n<li>b</li>\n</ol>');
  });

  it('renders fenced code blocks without interpreting content', () => {
    const html = renderMarkdown('```\n<a onclick="x">\n```');
    expect(html).toContain('<pre><code>&lt;a onclick=&quot;x&quot;&gt;</code></pre>');
  });

  it('applies inline emphasis and links', () => {
    const html = renderMarkdown(
      '**bold** and *italics* and [site](https://example.test)',
    );
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italics</em>');
    expect(html).toContain(
      '<a href="https://example.test" rel="noopener noreferrer">site</a>',
    );
  });

  it('escapes raw HTML so notes are injection-safe', () => {
    const html = renderMarkdown('<script>alert(1)</script>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('renders blockquotes and horizontal rules', () => {
    expect(renderMarkdown('> quoted')).toContain('<blockquote>quoted</blockquote>');
    expect(renderMarkdown('---')).toContain('<hr />');
  });
});

describe('markdownPreview', () => {
  it('strips heading and list markers for a short summary', () => {
    expect(markdownPreview('# Big plan\n- prep')).toBe('Big plan prep');
  });
});
