import {
  generateClientId,
  getPlatformCode,
  isValidClientIdFormat,
} from './generate-client-id';

describe('generate-client-id', () => {
  describe('getPlatformCode()', () => {
    const NONE = { isElectron: false, isAndroid: false, isIos: false };

    it('maps each platform to its own character', () => {
      expect(getPlatformCode({ ...NONE, isElectron: true })).toBe('E');
      expect(getPlatformCode({ ...NONE, isAndroid: true })).toBe('A');
      expect(getPlatformCode({ ...NONE, isIos: true })).toBe('I');
      expect(getPlatformCode(NONE)).toBe('B');
    });

    it('resolves overlapping platforms as Electron > Android > iOS', () => {
      // The predicates are independent, so the precedence is a real guard. The
      // near case is macOS Electron, which already matches IS_IOS's `Mac`
      // user-agent half — see the note on getPlatformCode. #9353.
      expect(getPlatformCode({ isElectron: true, isAndroid: true, isIos: true })).toBe(
        'E',
      );
      expect(getPlatformCode({ ...NONE, isAndroid: true, isIos: true })).toBe('A');
    });
  });

  describe('generateClientId()', () => {
    it('uses the browser code in the Karma browser env', () => {
      // IS_ELECTRON, IS_ANDROID_WEB_VIEW, IS_IOS_NATIVE and IS_IOS are all false
      // here — same smoke-test shape as get-app-version-str.spec.ts. Per-branch
      // assertions live on getPlatformCode(), since the constants behind them
      // are frozen at module load and cannot be stubbed.
      expect(generateClientId().charAt(0)).toBe('B');
    });

    it('produces an id matching the new {platform}_{6-char} format', () => {
      expect(/^[BEAI]_[a-zA-Z0-9]{6}$/.test(generateClientId())).toBeTrue();
    });

    it('produces a distinct id on each call', () => {
      // 50 random 6-char base62 ids — a collision is astronomically unlikely.
      const ids = new Set(Array.from({ length: 50 }, () => generateClientId()));
      expect(ids.size).toBe(50);
    });

    it('always passes its own format guard', () => {
      for (let i = 0; i < 20; i++) {
        expect(isValidClientIdFormat(generateClientId())).toBeTrue();
      }
    });
  });

  describe('isValidClientIdFormat()', () => {
    it('accepts the new compact format', () => {
      expect(isValidClientIdFormat('B_a7Kx9Z')).toBeTrue();
      expect(isValidClientIdFormat('E_000000')).toBeTrue();
      expect(isValidClientIdFormat('I_ZzZzZz')).toBeTrue();
    });

    it('accepts legacy ids of length >= 10', () => {
      expect(isValidClientIdFormat('LongClientId123')).toBeTrue();
      expect(isValidClientIdFormat('0123456789')).toBeTrue();
    });

    it('rejects short, non-conforming strings', () => {
      expect(isValidClientIdFormat('BAD')).toBeFalse();
      expect(isValidClientIdFormat('')).toBeFalse();
      expect(isValidClientIdFormat('B_a7Kx9')).toBeFalse(); // 5-char suffix
      expect(isValidClientIdFormat('X_a7Kx9Z')).toBeFalse(); // unknown platform
    });

    it('rejects non-string values', () => {
      expect(isValidClientIdFormat(undefined)).toBeFalse();
      expect(isValidClientIdFormat(null)).toBeFalse();
      expect(isValidClientIdFormat(42)).toBeFalse();
      expect(isValidClientIdFormat({})).toBeFalse();
    });
  });
});
