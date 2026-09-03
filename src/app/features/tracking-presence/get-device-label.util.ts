import { PlatformCode, getCurrentPlatformCode } from '../../core/util/generate-client-id';

const LABEL_BY_PLATFORM: Record<PlatformCode, string> = {
  E: 'Desktop',
  A: 'Android',
  I: 'iOS',
  B: 'Browser',
};

/**
 * Hard cap on any label that goes over the wire. Mirrored by the wire-size
 * spec (`tracking-presence-wire-size.spec.ts`), which pins a 32-char label
 * against the pre-18.21 server frame limit — raise both or neither.
 */
export const MAX_DEVICE_LABEL_LENGTH = 32;

/**
 * OS family from a user-agent string, or null when unrecognised. Coarse on
 * purpose: the server already sees this UA on every HTTP request, so naming
 * the OS family leaks nothing new, unlike a hostname or model name would.
 * Order matters — Android UAs also contain "Linux".
 */
const OS_BY_UA: [RegExp, string][] = [
  [/Android/, 'Android'],
  [/Windows/, 'Windows'],
  [/CrOS/, 'ChromeOS'],
  [/Mac/, 'macOS'],
  [/Linux/, 'Linux'],
];

export const getOsLabel = (userAgent: string): string | null =>
  OS_BY_UA.find(([re]) => re.test(userAgent))?.[1] ?? null;

/**
 * Platform-derived default label, e.g. 'Desktop (Linux)', 'Android'. Desktop
 * and browser clients carry the OS family so two desktops on different OSes
 * are told apart without any configuration; mobile platforms already name
 * their OS. Still no hostname or model — see `getDeviceLabel`.
 */
export const getDefaultDeviceLabel = (
  platform: PlatformCode,
  osLabel: string | null,
): string => {
  const base = LABEL_BY_PLATFORM[platform];
  return (platform === 'E' || platform === 'B') && osLabel
    ? `${base} (${osLabel})`
    : base;
};

/**
 * Relayed payload fields are untrusted (with E2EE off a hostile server can
 * inject them). The label ends up as a translate param inside an [innerHtml]
 * snack, so strip markup-capable chars and cap length instead of trusting it.
 * Applied on BOTH ends (producer and viewer) so what a user types as their
 * device name is exactly what their other devices show.
 */
export const sanitizeDeviceLabel = (v: unknown): string =>
  typeof v === 'string'
    ? v.replace(/[<>&"'`]/g, '').slice(0, MAX_DEVICE_LABEL_LENGTH)
    : '';

/**
 * Platform-derived default label for this device, shown on OTHER devices
 * ("Tracking on Desktop (macOS)"). Deliberately coarse — no hostname or
 * model, so nothing personally identifying transits the server when
 * encryption is off and the default needs no configuration. Two same-OS
 * desktops are told apart by the optional per-device name instead
 * (`resolveDeviceLabel`).
 *
 * Derived from the shared platform code rather than re-checking IS_* flags:
 * local re-derivation of platform detection is what broke in #9353.
 */
export const getDeviceLabel = (): string =>
  getDefaultDeviceLabel(getCurrentPlatformCode(), getOsLabel(navigator.userAgent));

/**
 * The label this device announces: the user's per-device name from the
 * SuperSync private config when set, else the platform default. Blank or
 * markup-only names fall back too, so a device can never announce itself as
 * an empty string.
 */
export const resolveDeviceLabel = (customName: unknown): string =>
  sanitizeDeviceLabel(customName).trim() || getDeviceLabel();
