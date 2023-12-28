import { app } from 'electron';
import { quitApp } from './various-shared';
import { startApp } from './start-app';

const IS_MAC = process.platform === 'darwin';

if (!IS_MAC) {
  // make it a single instance by closing other instances but allow for dev mode
  // because of https://github.com/electron/electron/issues/14094
  const isLockObtained = app.requestSingleInstanceLock();
  if (!isLockObtained) {
    console.log('EXITING due to failed single instance lock');
    quitApp();
  } else {
    console.log('Start app...');
    startApp();
  }
} else {
  startApp();
}
