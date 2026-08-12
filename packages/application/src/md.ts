// Framework-free, XSS-safe Markdown renderer for notes. Input is HTML-escaped
// first, then a small, deterministic block/inline pass emits a fixed whitelist
// of tags. It is not a general Markdown engine — it covers the note surface
// (headings, lists, blockquote, fenced code, hr, inline emphasis and links).

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const escapeAttribute = (value: string): string =>
  escapeHtml(value).replace(/`/g, '&#96;');

// Each entry's callback receives (match, ...captureGroups); a leading `_` in
// the parameter name marks an intentionally ignored group.
const inlinePatterns: Array<{ re: RegExp; replace: (...args: string[]) => string }> = [
  {
    re: /\*\*([^*]+)\*\*/g,
    replace: (_m, content: string) => `<strong>${content}</strong>`,
  },
  { re: /__([^_]+)__/g, replace: (_m, content: string) => `<strong>${content}</strong>` },
  {
    re: /(^|[^*])\*([^*\n]+)\*/g,
    replace: (_m, pre: string, content: string) => `${pre}<em>${content}</em>`,
  },
  {
    re: /(^|[^_])_([^_\n]+)_/g,
    replace: (_m, pre: string, content: string) => `${pre}<em>${content}</em>`,
  },
  { re: /~~([^~]+)~~/g, replace: (_m, content: string) => `<del>${content}</del>` },
  { re: /`([^`\n]+)`/g, replace: (_m, content: string) => `<code>${content}</code>` },
  {
    re: /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    replace: (_m, label: string, url: string) =>
      `<a href="${escapeAttribute(url)}" rel="noopener noreferrer">${label}</a>`,
  },
];

const inline = (value: string): string => {
  let result = escapeHtml(value);
  for (const { re, replace } of inlinePatterns) result = result.replace(re, replace);
  return result;
};

const isFenceStart = (line: string): boolean => /^```/.test(line);

/** Renders Markdown source to an HTML fragment (safe against injection). */
export const renderMarkdown = (source: string): string => {
  const lines = source.split(/\r?\n/);
  const parts: string[] = [];
  let inFence = false;
  let fence: string[] | undefined;
  let list: 'ul' | 'ol' | undefined;
  let paragraph: string[] | undefined;

  const flushParagraph = (): void => {
    if (paragraph && paragraph.length) {
      parts.push(`<p>${inline(paragraph.join(' '))}</p>`);
    }
    paragraph = undefined;
  };
  const flushList = (): void => {
    if (list) parts.push(`</${list}>`);
    list = undefined;
  };

  for (const raw of lines) {
    if (inFence) {
      if (isFenceStart(raw)) {
        parts.push(`<pre><code>${escapeHtml(fence?.join('\n') ?? '')}</code></pre>`);
        inFence = false;
        fence = undefined;
      } else {
        fence?.push(raw);
      }
      continue;
    }
    if (isFenceStart(raw)) {
      flushParagraph();
      flushList();
      inFence = true;
      fence = [];
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(raw);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      parts.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }
    if (/^\s*[-*_]\s*[-*_]\s*[-*_]\s*$/.test(raw)) {
      flushParagraph();
      flushList();
      parts.push('<hr />');
      continue;
    }
    if (raw.trim() === '') {
      flushParagraph();
      continue;
    }
    const blockquote = /^>\s?(.*)$/.exec(raw);
    if (blockquote) {
      flushParagraph();
      flushList();
      parts.push(`<blockquote>${inline(blockquote[1])}</blockquote>`);
      continue;
    }
    const ordered = /^\s*\d+[.)]\s+(.*)$/.exec(raw);
    const bullet = /^\s*[-*+]\s+(.*)$/.exec(raw);
    if (bullet || ordered) {
      flushParagraph();
      const isOrdered = Boolean(ordered);
      const item = ordered?.[1] ?? bullet?.[1] ?? '';
      if (list !== (isOrdered ? 'ol' : 'ul')) {
        flushList();
        list = isOrdered ? 'ol' : 'ul';
        parts.push(`<${list}>`);
      }
      parts.push(`<li>${inline(item)}</li>`);
      continue;
    }
    // plain paragraph line
    flushList();
    paragraph = paragraph ?? [];
    paragraph.push(raw);
  }
  if (inFence && fence) {
    parts.push(`<pre><code>${escapeHtml(fence.join('\n'))}</code></pre>`);
  }
  flushList();
  flushParagraph();
  return parts.join('\n');
};

/** Plain-text preview of the first non-empty line(s) of a Markdown note. */
export const markdownPreview = (source: string, maxLines = 2): string =>
  source
    .split(/\r?\n/)
    .map((line) => line.replace(/^#{1,6}\s+/g, '').replace(/^[-*+]\s+/, ''))
    .filter((line) => line.trim())
    .slice(0, maxLines)
    .join(' ');
