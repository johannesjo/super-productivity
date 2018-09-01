const LS_STATE_KEY = 'SP_STATE';

export const loadState = () => {
  const serializedState = localStorage.getItem(LS_STATE_KEY);
  if (serializedState === null) {
    return undefined;
  }
  return JSON.parse(serializedState);
};

export const saveState = (state) => {
  const serializedState = JSON.stringify(state);
  localStorage.setItem(LS_STATE_KEY, serializedState);
};
