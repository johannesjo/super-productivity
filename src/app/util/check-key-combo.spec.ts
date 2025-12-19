import { checkKeyCombo, KEYS, prepareKeyCode } from './check-key-combo';

/**
 * A Map where keys are string representations of key codes,
 * and values are the corresponding characters or symbols for this layout.
 *
 * See https://developer.mozilla.org/en-US/docs/Web/API/KeyboardLayoutMap#browser_compatibility
 */
type KeyboardLayout = Map<string, string>;

const MOCK_LAYOUTS = {
  QWERTZ_DE: new Map([
    ['KeyK', 'k'],
    ['KeyG', 'g'],
    ['Digit2', '2'],
    ['Digit0', '0'],
    ['KeyV', 'v'],
    ['KeyA', 'a'],
    ['Backquote', '^'],
    ['KeyL', 'l'],
    ['IntlBackslash', '<'],
    ['Quote', 'ä'],
    ['KeyW', 'w'],
    ['Digit8', '8'],
    ['KeyM', 'm'],
    ['KeyH', 'h'],
    ['Period', '.'],
    ['Digit7', '7'],
    ['Digit1', '1'],
    ['KeyP', 'p'],
    ['KeyD', 'd'],
    ['KeyF', 'f'],
    ['KeyO', 'o'],
    ['KeyQ', 'q'],
    ['KeyC', 'c'],
    ['KeyN', 'n'],
    ['BracketLeft', 'ü'],
    ['KeyZ', 'y'],
    ['KeyY', 'z'],
    ['Digit3', '3'],
    ['Digit6', '6'],
    ['Digit5', '5'],
    ['KeyX', 'x'],
    ['Slash', '-'],
    ['Backslash', '#'],
    ['Comma', ','],
    ['Minus', 'ß'],
    ['Digit4', '4'],
    ['KeyB', 'b'],
    ['KeyT', 't'],
    ['Digit9', '9'],
    ['KeyS', 's'],
    ['KeyI', 'i'],
    ['KeyU', 'u'],
    ['Equal', "'"],
    ['KeyJ', 'j'],
    ['Semicolon', 'ö'],
    ['KeyR', 'r'],
    ['BracketRight', '+'],
    ['KeyE', 'e'],
  ]) satisfies KeyboardLayout,
  QWERTY_EN: new Map([
    ['KeyK', 'k'],
    ['KeyG', 'g'],
    ['Digit2', '2'],
    ['Digit0', '0'],
    ['KeyV', 'v'],
    ['KeyA', 'a'],
    ['Backquote', '`'],
    ['KeyL', 'l'],
    ['IntlBackslash', '<'],
    ['Quote', "'"],
    ['KeyW', 'w'],
    ['Digit8', '8'],
    ['KeyM', 'm'],
    ['KeyH', 'h'],
    ['Period', '.'],
    ['Digit7', '7'],
    ['Digit1', '1'],
    ['KeyP', 'p'],
    ['KeyD', 'd'],
    ['KeyF', 'f'],
    ['KeyO', 'o'],
    ['KeyQ', 'q'],
    ['KeyC', 'c'],
    ['KeyN', 'n'],
    ['BracketLeft', '['],
    ['KeyZ', 'z'],
    ['KeyY', 'y'],
    ['Digit3', '3'],
    ['Digit6', '6'],
    ['Digit5', '5'],
    ['KeyX', 'x'],
    ['Slash', '/'],
    ['Backslash', '\\'],
    ['Comma', ','],
    ['Minus', '-'],
    ['Digit4', '4'],
    ['KeyB', 'b'],
    ['KeyT', 't'],
    ['Digit9', '9'],
    ['KeyS', 's'],
    ['KeyI', 'i'],
    ['KeyU', 'u'],
    ['Equal', '='],
    ['KeyJ', 'j'],
    ['Semicolon', ';'],
    ['KeyR', 'r'],
    ['BracketRight', ']'],
    ['KeyE', 'e'],
  ]) satisfies KeyboardLayout,
  // In some layouts some key mapping may be missing (e.g. "Equal", "Minus")
  QWERTY_RU: new Map([
    ['KeyK', 'k'],
    ['KeyG', 'g'],
    ['Digit2', '2'],
    ['KeyV', 'v'],
    ['KeyA', 'a'],
    ['Backquote', '`'],
    ['KeyL', 'l'],
    ['Quote', "'"],
    ['KeyW', 'w'],
    ['Digit8', '8'],
    ['KeyM', 'm'],
    ['KeyH', 'h'],
    ['Period', '.'],
    ['Digit7', '7'],
    ['KeyP', 'p'],
    ['KeyD', 'd'],
    ['KeyF', 'f'],
    ['KeyQ', 'q'],
    ['KeyO', 'o'],
    ['KeyC', 'c'],
    ['KeyN', 'n'],
    ['BracketLeft', '['],
    ['KeyZ', 'z'],
    ['KeyY', 'y'],
    ['Digit3', '3'],
    ['Digit6', '6'],
    ['KeyX', 'x'],
    ['Slash', '/'],
    ['Backslash', '\\'],
    ['Comma', ','],
    ['Digit4', '4'],
    ['KeyB', 'b'],
    ['KeyT', 't'],
    ['KeyS', 's'],
    ['KeyI', 'i'],
    ['KeyU', 'u'],
    ['KeyJ', 'j'],
    ['KeyR', 'r'],
    ['Semicolon', ';'],
    ['BracketRight', ']'],
    ['KeyE', 'e'],
  ]) satisfies KeyboardLayout,
  get all() {
    return [this.QWERTY_EN, this.QWERTY_RU, this.QWERTZ_DE];
  },
};

/**
 * Overrides the keyboard layout for testing so that the `navigator.keyboard.getLayoutMap` method returns the provided layout
 */
const overrideLayout = (layout: KeyboardLayout): void => {
  Object.defineProperty(window, 'navigator', {
    value: {
      keyboard: {
        getLayoutMap: () => new Promise((resolve) => resolve(layout)),
      },
    },
  });
};

/**
 * Runs the given expectation with each specified keyboard layout
 */
const withLayouts = (expectation: () => void, layouts: KeyboardLayout[]): void => {
  layouts.forEach((layout) => {
    overrideLayout(layout);
    expectation();
  });
};

describe('checkKeyCombo', () => {
  it('should return a true if specified key combination are pressed', async () => {
    const ev: Partial<KeyboardEvent> = {
      code: 'KeyA',
      ctrlKey: true,
      shiftKey: true,
    };

    withLayouts(async () => {
      expect(await checkKeyCombo(ev as any, 'Ctrl+Shift+A')).toBe(true);
    }, MOCK_LAYOUTS.all);
  });

  it('should return a false if any key in the combination is not pressed', async () => {
    const ev: Partial<KeyboardEvent> = {
      code: 'KeyA',
      ctrlKey: true,
      shiftKey: true,
    };
    const comboToCheck = 'Ctrl+Shift+A';

    withLayouts(async () => {
      expect(await checkKeyCombo({ ...ev, ctrlKey: false } as any, comboToCheck)).toBe(
        false,
      );
      expect(await checkKeyCombo({ ...ev, shiftKey: false } as any, comboToCheck)).toBe(
        false,
      );
      expect(await checkKeyCombo({ ...ev, code: 'KeyB' } as any, comboToCheck)).toBe(
        false,
      );
    }, MOCK_LAYOUTS.all);
  });

  it('should return a false if any additional modifiers are pressed', async () => {
    const ev: Partial<KeyboardEvent> = { code: 'KeyF', shiftKey: true };

    withLayouts(async () => {
      expect(await checkKeyCombo({ ...ev } as any, 'F')).toBe(false);
      expect(await checkKeyCombo({ ...ev, ctrlKey: true } as any, 'Shift+F')).toBe(false);
    }, MOCK_LAYOUTS.all);
  });

  it('should not throw when the key combination is not provided (undefined)', async () => {
    const ev: Partial<KeyboardEvent> = {
      code: 'KeyA',
      ctrlKey: true,
      shiftKey: true,
    };

    withLayouts(async () => {
      expect(await checkKeyCombo(ev as any, undefined)).toBe(false);
    }, MOCK_LAYOUTS.all);
  });

  it('should correctly identify the "Y" key in QWERTY and QWERTZ layouts', async () => {
    withLayouts(async () => {
      const ev: Partial<KeyboardEvent> = { code: 'KeyY' };
      expect(await prepareKeyCode(ev as any)).toBe('Y');
    }, [MOCK_LAYOUTS.QWERTY_EN, MOCK_LAYOUTS.QWERTY_RU]);

    withLayouts(async () => {
      const ev: Partial<KeyboardEvent> = { code: 'KeyZ' };
      expect(await prepareKeyCode(ev as any)).toBe('Y');
    }, [MOCK_LAYOUTS.QWERTZ_DE]);
  });

  it('should correctly identify the "+" key', async () => {
    withLayouts(async () => {
      const ev: Partial<KeyboardEvent> = { code: KEYS.PLUS.code };

      expect(await prepareKeyCode(ev as any)).toBe('+');
      expect(await checkKeyCombo(ev as any, '+')).toBe(true);
      expect(await checkKeyCombo({ ...ev, ctrlKey: true } as any, 'Ctrl++')).toBe(true);
    }, [MOCK_LAYOUTS.QWERTY_EN]);

    withLayouts(async () => {
      const ev: Partial<KeyboardEvent> = { code: KEYS.PLUS.code };

      expect(await prepareKeyCode(ev as any)).toBe('+');
      expect(await checkKeyCombo(ev as any, '+')).toBe(true);
      expect(await checkKeyCombo({ ...ev, ctrlKey: true } as any, 'Ctrl++')).toBe(true);
    }, [MOCK_LAYOUTS.QWERTY_RU]);

    withLayouts(async () => {
      const ev: Partial<KeyboardEvent> = { code: 'BracketRight' };

      expect(await prepareKeyCode(ev as any)).toBe('+');
      expect(await checkKeyCombo(ev as any, '+')).toBe(true);
      expect(await checkKeyCombo({ ...ev, ctrlKey: true } as any, 'Ctrl++')).toBe(true);
    }, [MOCK_LAYOUTS.QWERTZ_DE]);
  });

  it('should correctly identify the "-" key', async () => {
    withLayouts(async () => {
      const ev: Partial<KeyboardEvent> = { code: KEYS.MINUS.code };

      expect(await checkKeyCombo(ev as any, '-')).toBe(true);
      expect(await checkKeyCombo({ ...ev, ctrlKey: true } as any, 'Ctrl+-')).toBe(true);
    }, [MOCK_LAYOUTS.QWERTY_EN, MOCK_LAYOUTS.QWERTY_RU]);

    withLayouts(async () => {
      const ev: Partial<KeyboardEvent> = { code: 'Slash' };

      expect(await checkKeyCombo(ev as any, '-')).toBe(true);
      expect(await checkKeyCombo({ ...ev, ctrlKey: true } as any, 'Ctrl+-')).toBe(true);
    }, [MOCK_LAYOUTS.QWERTZ_DE]);
  });

  it('should correctly identify digit keys', async () => {
    const ev: Partial<KeyboardEvent> = { code: 'Digit0' };

    withLayouts(async () => {
      expect(await checkKeyCombo(ev as any, '0')).toBe(true);
      expect(await checkKeyCombo({ ...ev, ctrlKey: true } as any, 'Ctrl+0')).toBe(true);
    }, MOCK_LAYOUTS.all);
  });
});
