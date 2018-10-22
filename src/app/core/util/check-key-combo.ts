export const checkKeyCombo = (ev: KeyboardEvent, comboToTest: string) => {
  if (comboToTest) {
    let isConditionMatched = true;
    const comboKeys: string[] = comboToTest.split('+');
    const standardKey: string = comboKeys[comboKeys.length - 1];
    const specialKeys = comboKeys.splice(0);
    specialKeys.splice(-1, 1);

    isConditionMatched = isConditionMatched && ((specialKeys.indexOf('Ctrl') === -1) || ev.ctrlKey === true);
    isConditionMatched = isConditionMatched && ((specialKeys.indexOf('Alt') === -1) || ev.altKey === true);
    isConditionMatched = isConditionMatched && ((specialKeys.indexOf('Shift') === -1) || ev.shiftKey === true);
    isConditionMatched = isConditionMatched && ((specialKeys.indexOf('Meta') === -1) || ev.metaKey === true);
    isConditionMatched = isConditionMatched && ev.key === standardKey;

    return isConditionMatched;
  } else {
    return null;
  }
};
