import { getIsAppReady, getWin } from './main-window';

const WAIT_FOR_WIN_TIMEOUT_DURATION = 4000;
const ERROR_EV = 'ELECTRON_ERROR';

export const errorHandler = (e = 'UNDEFINED ERROR', additionalLogInfo?) => {
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

function _isReadyForFrontEndError() {
  const mainWin = getWin();
  const isAppReady = getIsAppReady();
  return mainWin && mainWin.webContents && isAppReady;
}

function _handleError(e, additionalLogInfo, errObj) {
  const mainWin = getWin();
  const stack = errObj.stack;

  console.error('ERR', e);
  console.log(stack);

  if (additionalLogInfo) {
    console.log('Additional Error info: ', additionalLogInfo);
  }

  if (_isReadyForFrontEndError()) {
    mainWin.webContents.send(ERROR_EV, {
      error: e,
      stack: stack,
    });
  } else {
    console.error('ERR', 'Frontend not loaded');
    throw errObj;
  }
}
