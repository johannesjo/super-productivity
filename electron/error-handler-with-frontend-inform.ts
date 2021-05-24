import { getIsAppReady, getWin } from './main-window';
import { IPC } from './ipc-events.const';
import { error, log } from 'electron-log';

const WAIT_FOR_WIN_TIMEOUT_DURATION = 4000;

export const errorHandlerWithFrontendInform = (
  e = 'UNDEFINED ERROR',
  additionalLogInfo?,
) => {
  const errObj = new Error(e);

  if (_isReadyForFrontEndError()) {
    _handleError(e, additionalLogInfo, errObj);
  } else {
    // try again a little later, when window might be ready
    setTimeout(() => {
      _handleError(e, additionalLogInfo, errObj);
    }, WAIT_FOR_WIN_TIMEOUT_DURATION);
  }
};

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
function _isReadyForFrontEndError() {
  const mainWin = getWin();
  const isAppReady = getIsAppReady();
  return mainWin && mainWin.webContents && isAppReady;
}

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
function _handleError(e, additionalLogInfo, errObj) {
  const mainWin = getWin();
  const stack = errObj.stack;

  console.error('ERR', e);
  log(stack);
  error(e, stack);

  if (additionalLogInfo) {
    log('Additional Error info: ', additionalLogInfo);
  }

  if (_isReadyForFrontEndError()) {
    mainWin.webContents.send(IPC.ERROR, {
      error: e,
      errorStr: e && e.toString(),
      stack,
    });
  } else {
    error('Electron Error: Frontend not loaded. Could not send error to renderer.');
    throw errObj;
  }
}
