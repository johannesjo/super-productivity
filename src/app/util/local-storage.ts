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
