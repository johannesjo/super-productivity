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
  | 'clipboard-link'
  | 'clipboard-text'
  | 'native';

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
