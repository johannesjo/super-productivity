import { LS_LAST_ACTIVE } from './ls-keys.const';

export const loadFromLs = (key) => {
  const serializedState = localStorage.getItem(key);
  if (serializedState === null) {
    return undefined;
  }
  return JSON.parse(serializedState);
};

export const saveToLs = (key, state) => {
  const serializedState = JSON.stringify(state);
  localStorage.setItem(key, serializedState);
};

export const saveToLsWithLastActive = (key, state) => {
  saveToLs(key, state);
  saveToLs(LS_LAST_ACTIVE, new Date().toString());
};
