const WAIT_FOR_WIN_TIMEOUT_DURATION = 5000;
const ERROR_EV = 'ELECTRON_ERROR';
const mainWinMod = require('./main-window');

module.exports = (e = 'UNDEFINED ERROR', additionalLogInfo) => {
  if (isReadyForFrontEndError()) {
    handleError(e, additionalLogInfo);
  } else {
    // try again a little later, when window might be ready
    setTimeout(() => {
      handleError(e, additionalLogInfo);
    }, WAIT_FOR_WIN_TIMEOUT_DURATION);
  }
};

function isReadyForFrontEndError() {
  const mainWin = mainWinMod.getWin();
  const isAppReady = mainWinMod.getIsAppReady();
  return mainWin && mainWin.webContents && isAppReady;
}

function handleError(e, additionalLogInfo) {
  const mainWin = mainWinMod.getWin();

  console.error('ERR', e);

  if (additionalLogInfo) {
    console.log('Additional Error info: ', additionalLogInfo);
  }

  if (isReadyForFrontEndError()) {
    mainWin.webContents.send(ERROR_EV, e);
  } else {
    console.error('ERR', 'Frontend not loaded');
    throw new Error(e)
  }
}