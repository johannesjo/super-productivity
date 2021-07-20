export const loadFromRealLs = (key: string): unknown => {
  const serializedState = localStorage.getItem(key);
  if (!serializedState || serializedState === '') {
    return undefined;
  }
  return JSON.parse(serializedState);
};

export const removeFromRealLs = (key: string): void => {
  localStorage.removeItem(key);
};

export const saveToRealLs = (
  key: string,
  state: { [key: string]: unknown } | unknown[],
): void => {
  const serializedState = JSON.stringify(state);
  localStorage.setItem(key, serializedState);
};

export const loadFromSessionStorage = (key: string): unknown => {
  const serializedState = sessionStorage.getItem(key);
  if (!serializedState || serializedState === '') {
    return undefined;
  }
  return JSON.parse(serializedState);
};

export const saveToSessionStorage = (
  key: string,
  state: { [key: string]: unknown },
): void => {
  const serializedState = JSON.stringify(state);
  sessionStorage.setItem(key, serializedState);
};
