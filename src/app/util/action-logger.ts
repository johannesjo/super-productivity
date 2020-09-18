import { loadFromRealLs, saveToRealLs } from '../core/persistence/local-storage';
import { LS_ACTION_BEFORE_LAST_ERROR_LOG, LS_ACTION_LOG } from '../core/persistence/ls-keys.const';

const NUMBER_OF_ACTIONS_TO_SAVE = 30;

const getActionLog = (): string[] => {
  const current = loadFromRealLs(LS_ACTION_LOG);
  return Array.isArray(current)
    ? current
    : [];
};

export const actionLogger = (action: any) => {
  if (action.type.indexOf('@ngrx') === 0) {
    return;
  }

  const current = getActionLog();
  if (current.length >= NUMBER_OF_ACTIONS_TO_SAVE) {
    current.shift();
  }
  current.push(`${Date.now()}: ${action.type}`);

  saveToRealLs(LS_ACTION_LOG, current);
};

export const saveBeforeLastErrorActionLog = () => {
  const current = getActionLog();
  console.log('Last actions before error:', current);
  saveToRealLs(LS_ACTION_BEFORE_LAST_ERROR_LOG, current);
};

export const getBeforeLastErrorActionLog = (): string[] => {
  const current = loadFromRealLs(LS_ACTION_BEFORE_LAST_ERROR_LOG);
  return Array.isArray(current)
    ? current
    : [];
};
