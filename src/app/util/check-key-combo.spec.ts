import { checkKeyCombo } from './check-key-combo';

describe('checkKeyCombo', () => {
  it('should return a true if keys are pressed', () => {
    const ev: Partial<KeyboardEvent> = {
      key: 'A',
      ctrlKey: true,
      shiftKey: true,
    };
    expect(checkKeyCombo(ev as any, 'Ctrl+Shift+A')).toBe(true);
  });

  it('should return a false if keys are not pressed', () => {
    const ev: Partial<KeyboardEvent> = {
      key: 'A',
      ctrlKey: true,
      shiftKey: true,
    };
    const comboToCheck = 'Ctrl+Shift+A';
    expect(checkKeyCombo({ ...ev, ctrlKey: false } as any, comboToCheck)).toBe(false);
    expect(checkKeyCombo({ ...ev, shiftKey: false } as any, comboToCheck)).toBe(false);
    expect(checkKeyCombo({ ...ev, key: 'B' } as any, comboToCheck)).toBe(false);
  });

  it('should not throw for undefined', () => {
    const ev: Partial<KeyboardEvent> = {
      key: 'A',
      ctrlKey: true,
      shiftKey: true,
    };
    expect((checkKeyCombo as any)(ev as any, undefined)).toBe(false);
  });
});
