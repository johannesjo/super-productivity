import {LS_LAST_ACTIVE} from './ls-keys.const';

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
//
//
// import {IS_ELECTRON} from '../../app.constants';
//
// const electronService = new ElectronService();
//
// console.log(electronService);
//
// export const loadFromLs = (key: string) => {
//   if (IS_ELECTRON) {
//     const electronStore = electronService.remote.require('electron-json-storage-sync');
//     console.log(electronStore);
//
//     return electronStore.get(key);
//   } else {
//     const serializedState = localStorage.getItem(key);
//     if (!serializedState || serializedState === '') {
//       return undefined;
//     }
//     return JSON.parse(serializedState);
//   }
// };
//
// export const saveToLs = (key: string, data) => {
//   if (IS_ELECTRON) {
//     const electronStore = electronService.remote.require('electron-json-storage-sync');
//     electronStore.set(key, data);
//   }
//   // still save to ls in case this bug gets fixed sometime in the future and also for easier debugging
//
//   const saveStr = (typeof data === 'number' || typeof data === 'string' || typeof data === 'boolean')
//     ? data.toString()
//     : JSON.stringify(data);
//   localStorage.setItem(key, saveStr);
// };
//
// export const loadFromSessionStorage = (key) => {
//   const serializedState = sessionStorage.getItem(key);
//   if (!serializedState || serializedState === '') {
//     return undefined;
//   }
//   return JSON.parse(serializedState);
// };
//
// export const saveToSessionStorage = (key, state) => {
//   const serializedState = JSON.stringify(state);
//   sessionStorage.setItem(key, serializedState);
// };
