import { PlatformCode, getCurrentPlatformCode } from '../../core/util/generate-client-id';

const LABEL_BY_PLATFORM: Record<PlatformCode, string> = {
  E: 'Desktop',
  A: 'Android',
  I: 'iOS',
  B: 'Browser',
};

/**
 * Platform-derived label for this device, shown on OTHER devices ("Tracking
 * on Desktop"). Deliberately coarse — no hostname or model, so nothing
 * personally identifying transits the server when encryption is off, and no
 * settings field is needed. The payload field stays a free string so richer
 * labels can ship later without a protocol change.
 *
 * Derived from the shared platform code rather than re-checking IS_* flags:
 * local re-derivation of platform detection is what broke in #9353.
 */
export const getDeviceLabel = (): string => LABEL_BY_PLATFORM[getCurrentPlatformCode()];
