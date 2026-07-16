/**
 * Suggested default base URL for hosts that target the
 * Super-Productivity-hosted NouraSync server. This is a hint for the
 * host application — the package itself never falls back to this URL
 * implicitly. Hosts that point at a different server simply ignore
 * this constant and supply their own `defaultBaseUrl` via
 * `NouraSyncDeps`.
 */
export const NOURA_SYNC_DEFAULT_BASE_URL = 'https://sync.super-productivity.com';

/**
 * Stable runtime identifier for the NouraSync provider. The string
 * literal (not an enum) keeps the package free of app-level enums
 * while remaining structurally compatible with `SyncProviderId.NouraSync`
 * on the app side.
 */
export const PROVIDER_ID_NOURA_SYNC = 'NouraSync' as const;

export interface NouraSyncPrivateCfg {
  /** Encryption key (length-only redacted at storage; never logged). */
  encryptKey?: string;
  /**
   * Base URL of the NouraSync server. When empty/undefined, the
   * provider falls back to the host-supplied `defaultBaseUrl` from
   * `NouraSyncDeps` — not to any package-level constant.
   */
  baseUrl?: string;
  /** JWT access token for authentication. */
  accessToken: string;
  /** Optional refresh token for token renewal. */
  refreshToken?: string;
  /** Token expiration timestamp (Unix ms). */
  expiresAt?: number;
  /** Whether E2E encryption is enabled for operation payloads. */
  isEncryptionEnabled?: boolean;
}

/**
 * Structural typing surface for callers that need WebSocket connection
 * parameters from a NouraSync provider. The bundled `NouraSyncProvider`
 * implements this interface, but callers should type against the
 * interface (or use `isNouraSyncWebSocketAccess`) rather than the
 * concrete class — that lets alternate providers expose the same
 * capability without an `instanceof` coupling on the host.
 *
 * @invariant Callers MUST NOT log the returned `accessToken`.
 */
export interface NouraSyncWebSocketAccess {
  getWebSocketParams(): Promise<{
    baseUrl: string;
    accessToken: string;
  } | null>;
}

/**
 * Structural type guard for `NouraSyncWebSocketAccess`. Use this on the
 * host side instead of `instanceof NouraSyncProvider` so the bundled
 * concrete class is not a load-bearing import in WebSocket plumbing.
 */
export const isNouraSyncWebSocketAccess = (
  value: unknown,
): value is NouraSyncWebSocketAccess => {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { getWebSocketParams?: unknown }).getWebSocketParams === 'function'
  );
};
