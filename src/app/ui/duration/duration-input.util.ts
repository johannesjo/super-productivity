import { stringToMs } from './string-to-ms.pipe';

export interface ProcessDurationInputResult {
  isValid: boolean;
  milliseconds: number | null;
  shouldUpdate: boolean;
}

export const processDurationInput = (
  strVal: string,
  isAllowSeconds: boolean = false,
  previousMsValue?: number | null,
): ProcessDurationInputResult => {
  try {
    // Allow any number with h, m units, or combinations like "2h 30m"
    const digitWithTimeUnitRegex = /(^\d+h(?: \d+m)?$)|(^\d+m$)|(^\d+h$)/i;

    // If input is without unit like 1h, 2m, 3h 30m, etc, return
    if (!digitWithTimeUnitRegex.test(strVal.trim())) {
      return {
        isValid: false,
        milliseconds: null,
        shouldUpdate: false,
      };
    }

    // Convert input string to milliseconds
    const ms = strVal ? stringToMs(strVal) : 0;

    return {
      isValid: true,
      milliseconds: ms,
      shouldUpdate: true,
    };
  } catch (err) {
    return {
      isValid: false,
      milliseconds: null,
      shouldUpdate: true,
    };
  }
};
