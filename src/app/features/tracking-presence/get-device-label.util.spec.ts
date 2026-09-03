import {
  MAX_DEVICE_LABEL_LENGTH,
  getDefaultDeviceLabel,
  getOsLabel,
  resolveDeviceLabel,
  sanitizeDeviceLabel,
} from './get-device-label.util';

describe('get-device-label.util', () => {
  describe('getOsLabel', () => {
    it('recognises desktop OS families', () => {
      expect(getOsLabel('Mozilla/5.0 (X11; Linux x86_64) Electron/38')).toBe('Linux');
      expect(getOsLabel('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe('macOS');
      expect(getOsLabel('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('Windows');
      expect(getOsLabel('Mozilla/5.0 (X11; CrOS x86_64 14541.0.0)')).toBe('ChromeOS');
    });

    it('reads Android before Linux (Android UAs contain both)', () => {
      expect(getOsLabel('Mozilla/5.0 (Linux; Android 14; Pixel 8)')).toBe('Android');
    });

    it('returns null for an unknown UA', () => {
      expect(getOsLabel('curl/8.0')).toBeNull();
    });
  });

  describe('getDefaultDeviceLabel', () => {
    it('suffixes desktop and browser labels with the OS family', () => {
      expect(getDefaultDeviceLabel('E', 'Linux')).toBe('Desktop (Linux)');
      expect(getDefaultDeviceLabel('B', 'Windows')).toBe('Browser (Windows)');
    });

    it('keeps mobile labels bare — the platform already names the OS', () => {
      expect(getDefaultDeviceLabel('A', 'Android')).toBe('Android');
      expect(getDefaultDeviceLabel('I', 'macOS')).toBe('iOS');
    });

    it('falls back to the bare platform label without an OS', () => {
      expect(getDefaultDeviceLabel('E', null)).toBe('Desktop');
    });
  });

  describe('sanitizeDeviceLabel', () => {
    it('strips markup-capable chars and caps the length', () => {
      expect(sanitizeDeviceLabel('<b>Jo\'s "PC"</b>')).toBe('bJos PC/b');
      expect(sanitizeDeviceLabel('x'.repeat(50)).length).toBe(MAX_DEVICE_LABEL_LENGTH);
    });

    it('returns an empty string for non-strings', () => {
      expect(sanitizeDeviceLabel(undefined)).toBe('');
      expect(sanitizeDeviceLabel({ evil: true })).toBe('');
    });
  });

  describe('resolveDeviceLabel', () => {
    it('prefers a trimmed custom name', () => {
      expect(resolveDeviceLabel('  Work laptop  ')).toBe('Work laptop');
    });

    it('falls back to the platform default for blank or markup-only names', () => {
      const fallback = resolveDeviceLabel(undefined);
      expect(fallback.length).toBeGreaterThan(0);
      expect(resolveDeviceLabel('   ')).toBe(fallback);
      expect(resolveDeviceLabel('<>')).toBe(fallback);
      expect(resolveDeviceLabel(42)).toBe(fallback);
    });

    it('is a fixed point of the viewer-side sanitizer', () => {
      const label = resolveDeviceLabel('Jo\'s "Mac" ' + 'x'.repeat(40));
      expect(sanitizeDeviceLabel(label)).toBe(label);
      expect(label.length).toBeLessThanOrEqual(MAX_DEVICE_LABEL_LENGTH);
    });
  });
});
