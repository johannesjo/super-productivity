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
        Minus: '-',
        Equal: '+',
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

  const pressedKey = prepareKeyCode(ev.code);

  const modifiersStatus: Record<string, boolean> = {
    Ctrl: ev.ctrlKey,
    Alt: ev.altKey,
    Meta: ev.metaKey,
    Shift: ev.shiftKey,
  };

  // Corner case: only "+" key (without any modifiers)
  if (
    comboToTest === '+' &&
    pressedKey === '+' &&
    Object.values(modifiersStatus).every((x) => !x)
  ) {
    return true;
  }

  // Corner case: combo includes "+" (e.g. "Ctrl++")
  const isPlusKey = comboToTest.includes('++');

  const comboKeys = isPlusKey
    ? comboToTest.split('+').filter((x) => !!x) // to remove empty strings when combo includes "+" key
    : comboToTest.split('+');
  const standardKey = comboKeys.pop();

  // Check all required modifiers in combo
  const isCorrectModifierPressed = comboKeys.every(
    (comboKey) => modifiersStatus[comboKey],
  );

  // Check that NO additional modifiers are pressed beyond what's required
  const requiredModifiers = new Set(comboKeys);
  const hasUnwantedModifiers = Object.entries(modifiersStatus).some(
    ([modifier, isPressed]) => isPressed && !requiredModifiers.has(modifier),
  );

  // Special case: if this is a plus key combination and the standardKey is a modifier,
  // we need to handle it differently
  if (
    isPlusKey &&
    standardKey &&
    ['Ctrl', 'Alt', 'Meta', 'Shift'].includes(standardKey)
  ) {
    // For cases like "Ctrl++", the standardKey is "Ctrl", so we need to check if Ctrl is pressed
    // and the pressed key is "+"
    const isCorrectModifierPressedSpecial = modifiersStatus[standardKey];
    const isCorrectKeyPressedSpecial = pressedKey === '+';

    // Check that NO additional modifiers are pressed beyond what's required
    const hasUnwantedModifiersSpecial = Object.entries(modifiersStatus).some(
      ([modifier, isPressed]) => isPressed && modifier !== standardKey,
    );

    return (
      isCorrectModifierPressedSpecial &&
      isCorrectKeyPressedSpecial &&
      !hasUnwantedModifiersSpecial
    );
  }

  // Check ...
  const isCorrectKeyPressed =
    // Convert keys to lowercase for more comatibility
    pressedKey.toLowerCase() === standardKey?.toLowerCase() ||
    (isPlusKey && pressedKey === '+');

  return isCorrectModifierPressed && isCorrectKeyPressed && !hasUnwantedModifiers;
};
