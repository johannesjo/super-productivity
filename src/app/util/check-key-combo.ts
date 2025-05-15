const isSpecialKeyExactlyRight = (
  isKeyRequired: boolean,
  isKeyPressed: boolean,
): boolean => {
  return (isKeyRequired && isKeyPressed) || (!isKeyRequired && !isKeyPressed);
};

export const checkKeyCombo = (
  ev: KeyboardEvent,
  comboToTest: string | null | undefined,
): boolean => {
  // NOTE: comboToTest can sometimes be undefined
  if (!!comboToTest) {
    const isPlusKey = comboToTest.includes('++');
    const comboKeys: string[] = comboToTest.split('+');
    const standardKey: string = comboKeys[comboKeys.length - 1];
    const sk = comboKeys.splice(0);

    sk.splice(-1, 1);

    return (
      isSpecialKeyExactlyRight(sk.includes('Ctrl'), ev.ctrlKey) &&
      isSpecialKeyExactlyRight(sk.includes('Alt'), ev.altKey) &&
      isSpecialKeyExactlyRight(sk.includes('Meta'), ev.metaKey) &&
      (!sk.includes('Shift') || ev.shiftKey) &&
      (ev.key === standardKey || (isPlusKey && ev.key === '+'))
    );
  }
  return false;
};
