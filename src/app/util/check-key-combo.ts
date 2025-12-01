// Just an alias for better readability
const PLUS_KEY = '+';
const MINUS_KEY = '-';

/**
 * Prepares key code (`event.code` from the keyboard event) so that it can be recognized in `checkKeyCombo()` func
 *
 * Removes special prefixes and mapping certain key codes to their corresponding characters
 *
 * @param code - The key code string to normalize (e.g., "KeyA", "Digit1", "Minus", "Equal").
 * @returns The normalized string representation of the key code (e.g., "A", "1", "-", "+").
 *
 * @example
 * // letters
 * prepareKeyCode("KeyA"); // Returns "A"
 * prepareKeyCode("A"); // Returns "A"
 *
 * // digits
 * prepareKeyCode("Digit1"); // Returns "1"
 * prepareKeyCode("1"); // Returns "1"
 *
 * // minus
 * prepareKeyCode("Minus"); // Returns "-"
 * prepareKeyCode("-"); // Returns "-"
 *
 * // plus
 * prepareKeyCode("Equal"); // Returns "+"
 * prepareKeyCode("+"); // Returns "+"
 */
export const prepareKeyCode = (code: string): string => {
  const rules: { codeMapping: Record<string, string>; replaces: Record<string, string> } =
    {
      codeMapping: {
        Minus: MINUS_KEY,
        Equal: PLUS_KEY,
      },
      replaces: {
        Key: '',
        Digit: '',
      },
    };

  // ! Replace prefixes (that's just the format of `e.code`)
  // - "Key" prefix
  // - "Digit" prefix
  for (const [prefix, replacer] of Object.entries(rules.replaces)) {
    if (code.startsWith(prefix)) code = code.replace(prefix, replacer);
  }

  return rules.codeMapping[code] || code;
};

/**
 * Checks if a specific key combination is pressed during a keyboard event
 *
 * @param ev - The keyboard event to check
 * @param comboToTest - The key combination to test (e.g., "Ctrl+A", "Shift++")
 * @returns `true` if the specified key combination is pressed. Otherwise - `false`
 *
 * @example
 * // Suppose Ctrl and A are pressed
 * checkKeyCombo(event, "Ctrl+A"); // Returns true
 *
 * // Suppose only the "+" key is pressed without modifiers
 * checkKeyCombo(event, "+"); // Returns true
 *
 * // Suppose Shift and A are pressed
 * checkKeyCombo(event, "Ctrl+A"); // Returns false
 */
export const checkKeyCombo = (
  ev: KeyboardEvent,
  comboToTest: string | null | undefined,
): boolean => {
  // NOTE: comboToTest can sometimes be undefined
  if (!comboToTest) return false;

  // Convert to lowercase for better compatibility
  comboToTest = comboToTest.toLowerCase();
  const pressedKey = prepareKeyCode(ev.code).toLowerCase();

  // Status of all modifiers that should be checked
  const modifiersStatus: Record<string, boolean> = {
    ctrl: ev.ctrlKey,
    alt: ev.altKey,
    meta: ev.metaKey,
    shift: ev.shiftKey,
  };

  // Corner case: only "+" key (without any modifiers)
  if (
    comboToTest === PLUS_KEY &&
    pressedKey === PLUS_KEY &&
    Object.values(modifiersStatus).every((x) => !x) // No modifiers should be pressed
  ) {
    return true;
  }

  // Corner case: combo includes "+" key (e.g. "Ctrl++")
  const isComboIncludesPlusKey = comboToTest.includes(PLUS_KEY + PLUS_KEY);

  // Prepared combo object with separated modifiers list and one key
  const splittedCombo = {
    _splitted: comboToTest.split(PLUS_KEY).filter((x) => !!x), // Filter to remove empty strings (when combo includes "++", e.g. "Ctrl++")
    get modifiers() {
      return isComboIncludesPlusKey ? this._splitted : this._splitted.slice(0, -1);
    },
    get key() {
      return isComboIncludesPlusKey ? PLUS_KEY : this._splitted.at(-1);
    },
  };

  const isAllModifiersValid = Object.keys(modifiersStatus).every((modKey) => {
    const isRequiredModifier = splittedCombo.modifiers.includes(modKey);
    return isRequiredModifier
      ? !!modifiersStatus[modKey] // Required modifiers should be pressed
      : !modifiersStatus[modKey]; // Not required modifiers should not be pressed
  });

  const isCorrectKeyPressed = isComboIncludesPlusKey
    ? pressedKey === PLUS_KEY
    : pressedKey === splittedCombo.key;

  return isAllModifiersValid && isCorrectKeyPressed;
};
