import { IS_ELECTRON } from '../../app.constants';
import { IS_IOS } from '../../util/is-ios';
import { IS_IOS_NATIVE } from '../../util/is-native-platform';
import { IS_ANDROID_WEB_VIEW } from '../../util/is-android-web-view';

/**
 * Client-ID generation and format validation.
 *
 * Extracted from ClientIdService so destructive-flow callers (clean-slate,
 * backup-restore) can mint an id without going through the stateful service —
 * the new id is persisted only inside the atomic SUP_OPS transaction in
 * OperationLogStoreService.runDestructiveStateReplacement. See issue #7732.
 *
 * No DI. Platform detection reuses the app-wide constants rather than
 * re-deriving it here: local re-derivation is what broke in #9353. Those
 * constants are frozen at module load and cannot be stubbed, so the mapping is
 * split into a pure `getPlatformCode()` that a spec can drive directly — the
 * same split `util/get-app-version-str.ts` uses for `distChannelSuffix()`.
 */

type PlatformCode = 'B' | 'E' | 'A' | 'I';

interface ClientPlatform {
  isElectron: boolean;
  isAndroid: boolean;
  isIos: boolean;
}

/**
 * Maps a platform to the single character that prefixes a compact client ID.
 * B = Browser, E = Electron, A = Android, I = iOS.
 *
 * The three predicates are independent, so nothing structurally prevents an
 * overlap and the order is a deliberate guard rather than an arbitrary one. The
 * closest real case is macOS Electron, which already satisfies `IS_IOS`'s
 * `Mac` user-agent half — only `'ontouchend' in document` (false on Macs today)
 * keeps it from also reading as iOS. Electron therefore wins first.
 */
export const getPlatformCode = (platform: ClientPlatform): PlatformCode => {
  if (platform.isElectron) {
    return 'E';
  }
  if (platform.isAndroid) {
    return 'A';
  }
  if (platform.isIos) {
    return 'I';
  }
  return 'B';
};

const _getEnvironmentId = (): PlatformCode =>
  getPlatformCode({
    isElectron: IS_ELECTRON,
    // `window.SUPAndroid`, injected by both Android activities
    // (CapacitorMainActivity and the legacy FullscreenActivity), so Play and
    // F-Droid both stay 'A'. Deliberately narrower than the `Android`+`wv`
    // user-agent test it replaces: our page inside some *other* app's WebView
    // is a browser for forensic purposes, and now reports 'B'.
    isAndroid: IS_ANDROID_WEB_VIEW,
    // Capacitor first — it is authoritative for the native app, which is the
    // case that actually broke, and cannot drift when Apple changes a UA. IS_IOS
    // is the web fallback: it carries the iPadOS desktop-UA workaround and keeps
    // mobile Safari on 'I'. IS_IOS_NATIVE alone would demote iPhone Safari to
    // 'B'; IS_IOS alone would leave native detection resting on a deprecated
    // `navigator.platform` heuristic — the same fragility as the original bug.
    isIos: IS_IOS_NATIVE || IS_IOS,
  });

/**
 * Generates a random base62 string of the specified length.
 * Uses crypto.getRandomValues() for non-predictable randomness.
 */
const _generateBase62 = (length: number): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
};

/**
 * Generates a compact client ID: {platform}_{6-char-base62}, e.g. "B_a7Kx9Z".
 */
export const generateClientId = (): string => {
  return `${_getEnvironmentId()}_${_generateBase62(6)}`;
};

/**
 * Type guard: true if `id` matches a known valid client-ID format.
 * - Legacy format: any string of length >= 10 (legacy IDs).
 * - New format: {platform}_{6-char-base62}, e.g. "B_a7Kx9Z".
 * - The 4-char suffix v18.7.0 - v18.10.0 minted, e.g. "B_FXMz". Only the
 *   generator moved to 6 chars; those ids are still on disk and stay valid.
 *
 * Used to narrow `unknown` values read from IndexedDB. An invalid format is
 * treated as "absent" rather than fatal — see issue #6197.
 *
 * The `[BEAI]` class is a compatibility contract with the installed fleet, not
 * a local detail. "Invalid" means "absent" all the way down: a client that does
 * not know a prefix reads null (`client-id.service.ts:165`) and then mints over
 * the stored id (`:217`) — a silent vector-clock key rotation, one-time per
 * install but permanent, the identity loss #7732 exists to prevent. So a fifth
 * platform code may only ship once the receiving fleet already accepts it.
 * Adding `E`/`I` here was safe precisely because every released client does.
 */
export const isValidClientIdFormat = (id: unknown): id is string => {
  return (
    typeof id === 'string' &&
    (id.length >= 10 || /^[BEAI]_([a-zA-Z0-9]{4}|[a-zA-Z0-9]{6})$/.test(id))
  );
};
