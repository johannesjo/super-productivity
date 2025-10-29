/**
 * Payload for sharing content
 */
export interface SharePayload {
  /** The main text content to share */
  text?: string;
  /** URL to share (e.g., app landing page with UTM parameters) */
  url?: string;
  /** Optional title (used by Reddit, Email) */
  title?: string;
  /** Optional file paths for native share (images, files) */
  files?: string[];
}

/**
 * Available share targets
 */
export type ShareTarget =
  | 'twitter'
  | 'linkedin'
  | 'reddit'
  | 'facebook'
  | 'whatsapp'
  | 'telegram'
  | 'email'
  | 'mastodon'
  | 'clipboard-text'
  | 'native'
  | 'download';

/**
 * Result of a share operation
 */
export interface ShareResult {
  /** Whether the share was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** The target that was used */
  target?: ShareTarget;
  /** Whether native share was attempted */
  usedNative?: boolean;
  /** Optional local filesystem path for download results */
  path?: string;
  /** Optional URI for native downloads */
  uri?: string;
}

/**
 * Configuration for share targets
 */
export interface ShareTargetConfig {
  /** Display label for the target */
  label: string;
  /** Material icon name */
  icon: string;
  /** Whether this target is available on the current platform */
  available: boolean;
  /** Optional color for the target button */
  color?: string;
}

/**
 * Options for the share dialog
 */
export interface ShareDialogOptions {
  /** The payload to share */
  payload: SharePayload;
  /** Whether to show the native share option */
  showNative?: boolean;
  /** Pre-selected Mastodon instance */
  mastodonInstance?: string;
}

/**
 * Options for sharing a canvas element as an image
 */
export interface ShareCanvasImageParams {
  /** Canvas element that should be shared */
  canvas: HTMLCanvasElement;
  /** Output filename including extension */
  filename?: string;
  /** Optional title to use for share dialogs */
  shareTitle?: string;
  /** Optional tagline configuration appended below the canvas */
  tagline?: ShareCanvasTagline;
  /** Disable download fallback when sharing is unavailable */
  fallbackToDownload?: boolean;
  /** Sharing mode, defaults to auto */
  mode?: 'auto' | 'download-only';
}

export interface ShareCanvasTagline {
  /** Tagline text rendered below the canvas image */
  text: string;
  /** Optional tagline area height; defaults to 48 */
  height?: number;
  /** Optional text color */
  color?: string;
}
