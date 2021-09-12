import { loadFromRealLs, saveToRealLs } from '../core/persistence/local-storage';
import {
  LS_ACTION_BEFORE_LAST_ERROR_LOG,
  LS_ACTION_LOG,
} from '../core/persistence/ls-keys.const';

const NUMBER_OF_ACTIONS_TO_SAVE = 30;

const getActionLog = (): string[] => {
  const current = loadFromRealLs(LS_ACTION_LOG);
  return Array.isArray(current) ? current : [];
};

export const actionLogger = (action: any): void => {
  if (action.type.indexOf('@ngrx') === 0) {
    return;
  }

  const current = getActionLog();
  if (current.length >= NUMBER_OF_ACTIONS_TO_SAVE) {
    current.shift();
  }
  const last = current[current.length - 1];

  // avoid logs with all the same action
  if (last && last.includes(action.type)) {
    const m = last.match(/\((\d+)\)$/);
    if (m && +m[1] > 0) {
      current[current.length - 1] = `${Date.now()}: ${action.type} (${+m[1] + 1})`;
    } else {
      current[current.length - 1] = `${Date.now()}: ${action.type} (2)`;
    }
  } else {
    current.push(`${Date.now()}: ${action.type}`);
  }

  saveToRealLs(LS_ACTION_LOG, current);
};

export const saveBeforeLastErrorActionLog = (): void => {
  const current = getActionLog();
  console.log('Last actions before error:', current);
  saveToRealLs(LS_ACTION_BEFORE_LAST_ERROR_LOG, current);
};

export const getBeforeLastErrorActionLog = (): string[] => {
  const current = loadFromRealLs(LS_ACTION_BEFORE_LAST_ERROR_LOG);
  return Array.isArray(current) ? current : [];
};
