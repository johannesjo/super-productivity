/**
 * Shared state module for Electron main process
 * Provides a single source of truth for application-wide flags
 */

let isQuiting = false;
let isLocked = false;

export const getIsQuiting = (): boolean => isQuiting;

export const setIsQuiting = (value: boolean): void => {
  isQuiting = value;
};

export const getIsLocked = (): boolean => isLocked;

export const setIsLocked = (value: boolean): void => {
  isLocked = value;
};
