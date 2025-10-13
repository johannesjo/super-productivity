import { checkKeyCombo } from './check-key-combo';

describe('checkKeyCombo', () => {
  it('should return a true if specified key combination are pressed', () => {
    const ev: Partial<KeyboardEvent> = {
      code: 'KeyA',
      ctrlKey: true,
      shiftKey: true,
    };
    expect(checkKeyCombo(ev as any, 'Ctrl+Shift+A')).toBe(true);
  });

  it('should return a false if any key in the combination is not pressed', () => {
    const ev: Partial<KeyboardEvent> = {
      code: 'KeyA',
      ctrlKey: true,
      shiftKey: true,
    };
    const comboToCheck = 'Ctrl+Shift+A';
    expect(checkKeyCombo({ ...ev, ctrlKey: false } as any, comboToCheck)).toBe(false);
    expect(checkKeyCombo({ ...ev, shiftKey: false } as any, comboToCheck)).toBe(false);
    expect(checkKeyCombo({ ...ev, code: 'KeyB' } as any, comboToCheck)).toBe(false);
  });

  it('should return a false if any additional modifiers are pressed', () => {
    const ev: Partial<KeyboardEvent> = { code: 'KeyF', shiftKey: true };
    expect(checkKeyCombo({ ...ev } as any, 'F')).toBe(false);
    expect(checkKeyCombo({ ...ev, ctrlKey: true } as any, 'Shift+F')).toBe(false);
  });

  it('should not throw when the key combination is not provided (undefined)', () => {
    const ev: Partial<KeyboardEvent> = {
      code: 'KeyA',
      ctrlKey: true,
      shiftKey: true,
    };
    expect(checkKeyCombo(ev as any, undefined)).toBe(false);
  });

  it('should correctly identify the "+" key', () => {
    const ev: Partial<KeyboardEvent> = { code: 'Equal' };
    expect(checkKeyCombo(ev as any, '+')).toBe(true);
    expect(checkKeyCombo({ ...ev, ctrlKey: true } as any, 'Ctrl++')).toBe(true);
  });

  it('should correctly identify the "-" key', () => {
    const ev: Partial<KeyboardEvent> = { code: 'Minus' };
    expect(checkKeyCombo(ev as any, '-')).toBe(true);
    expect(checkKeyCombo({ ...ev, ctrlKey: true } as any, 'Ctrl+-')).toBe(true);
  });

  it('should correctly identify digit keys', () => {
    const ev: Partial<KeyboardEvent> = { code: 'Digit0' };
    expect(checkKeyCombo(ev as any, '0')).toBe(true);
    expect(checkKeyCombo({ ...ev, ctrlKey: true } as any, 'Ctrl+0')).toBe(true);
  });
});
