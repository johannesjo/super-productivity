import { SharePayload, ShareTarget } from './share.model';

/**
 * Clean up text by normalizing whitespace and blank lines.
 */
export const cleanupText = (text: string): string => {
  if (!text) {
    return '';
  }

  const lines = text.split(/\r?\n/);
  const cleaned: string[] = [];
  let pendingBlank = false;

  for (const rawLine of lines) {
    const normalizedLine = rawLine.replace(/\s{2,}/g, ' ').trim();
    if (!normalizedLine) {
      if (cleaned.length > 0) {
        pendingBlank = true;
      }
      continue;
    }
    if (pendingBlank) {
      cleaned.push('');
      pendingBlank = false;
    }
    cleaned.push(normalizedLine);
  }

  return cleaned.join('\n').trim();
};

/**
 * Convert multi-line text to single line with spaces.
 */
export const inlineShareText = (text: string): string => {
  const normalized = cleanupText(text);
  if (!normalized) {
    return '';
  }

  return normalized
    .split(/\r?\n+/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

/**
 * Remove hashtags from text.
 */
export const stripHashtags = (text: string): string => {
  if (!text) {
    return '';
  }

  return text.replace(/(^|[\s])#[\p{L}\p{N}_-]+/gu, (match, prefix) => prefix);
};

/**
 * Remove emojis from text.
 */
export const stripEmojis = (text: string): string => {
  if (!text) {
    return '';
  }

  return text.replace(/\p{Extended_Pictographic}|\uFE0F|\uFE0E|\u200D/gu, '');
};

/**
 * Get the share title from payload (title, first line of text, or URL).
 */
export const getShareTitle = (payload: SharePayload): string => {
  const title = payload.title?.trim();
  if (title) {
    return title.slice(0, 300);
  }

  const text = payload.text?.trim();
  if (text) {
    const firstNonEmptyLine = text
      .split(/\r?\n+/)
      .map((line) => line.trim())
      .find((line) => line.length > 0);
    if (firstNonEmptyLine) {
      return firstNonEmptyLine.slice(0, 300);
    }
  }

  const url = payload.url?.trim();
  if (url) {
    return url;
  }

  return 'Check this out';
};

/**
 * Build share text combining text and URL.
 */
export const buildShareText = (payload: SharePayload): string => {
  const text = payload.text?.trim() ?? '';
  const url = payload.url?.trim() ?? '';

  if (!text && !url) {
    return '';
  }

  if (!url) {
    return text;
  }

  if (!text) {
    return url;
  }

  if (text.includes(url)) {
    return text;
  }

  return `${text}\n\n${url}`;
};

/**
 * Build provider-specific text with optional hashtag/emoji stripping.
 */
export const buildProviderText = (
  payload: SharePayload,
  provider: ShareTarget,
): string => {
  let text = cleanupText(buildShareText(payload));

  if (!text) {
    return payload.url?.trim() || '';
  }

  if (provider !== 'twitter' && provider !== 'mastodon') {
    text = cleanupText(stripHashtags(text));
  }

  if (provider === 'whatsapp') {
    text = cleanupText(stripEmojis(text));
  }

  return text || payload.url?.trim() || '';
};

/**
 * Build provider-specific title with optional hashtag/emoji stripping.
 */
export const buildProviderTitle = (baseTitle: string, provider: ShareTarget): string => {
  let title = baseTitle?.trim() || '';

  if (!title) {
    return title;
  }

  if (provider !== 'twitter' && provider !== 'mastodon') {
    title = stripHashtags(title);
  }

  if (provider === 'whatsapp') {
    title = stripEmojis(title);
  }

  return title.replace(/\s{2,}/g, ' ').trim();
};

/**
 * Encode text for WhatsApp sharing.
 */
export const encodeForWhatsApp = (text: string): string => {
  const cleaned = cleanupText(text);
  return encodeURIComponent(cleaned || 'https://super-productivity.com');
};

/**
 * Ensure payload has text field (fallback to title or URL if empty).
 */
export const ensureShareText = (payload: SharePayload): SharePayload => {
  const existingText = typeof payload.text === 'string' ? payload.text.trim() : '';
  if (existingText.length > 0) {
    if (payload.text === existingText) {
      return payload;
    }
    return {
      ...payload,
      text: existingText,
    };
  }

  const fallbackParts: string[] = [];
  const title = payload.title?.trim();
  if (title) {
    fallbackParts.push(title);
  }

  const url = payload.url?.trim();
  if (url) {
    fallbackParts.push(url);
  }

  const fallbackText = fallbackParts.join('\n\n').trim();
  if (!fallbackText) {
    return payload;
  }

  return {
    ...payload,
    text: fallbackText,
  };
};

/**
 * Format payload as plain text for clipboard.
 */
export const formatTextForClipboard = (payload: SharePayload): string => {
  const parts: string[] = [];

  if (payload.title) {
    parts.push(payload.title);
    parts.push('');
  }

  if (payload.text) {
    parts.push(payload.text);
  }

  if (payload.url) {
    if (payload.text) {
      parts.push('');
    }
    parts.push(payload.url);
  }

  return parts.join('\n');
};
