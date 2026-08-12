/** Renders Markdown source to an HTML fragment (safe against injection). */
export declare const renderMarkdown: (source: string) => string;
/** Plain-text preview of the first non-empty line(s) of a Markdown note. */
export declare const markdownPreview: (source: string, maxLines?: number) => string;
