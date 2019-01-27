import { LS_LAST_ACTIVE } from './ls-keys.const';

export const loadFromLs = (key) => {
  const serializedState = localStorage.getItem(key);
  if (!serializedState || serializedState === '') {
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

export const loadFromSessionStorage = (key) => {
  const serializedState = sessionStorage.getItem(key);
  if (!serializedState || serializedState === '') {
    return undefined;
  }
  return JSON.parse(serializedState);
};

export const saveToSessionStorage = (key, state) => {
  const serializedState = JSON.stringify(state);
  sessionStorage.setItem(key, serializedState);
};
