'use strict';
import { errorHandler } from './error-handler';
import { exec } from 'child_process';

let cmd;

// todo check if programm exists
// command -v foo >/dev/null 2>&1 || { echo >&2 "I require foo but it's not installed.  Aborting."; exit 1; }
const isLinux = (process.platform === 'linux');
let isNoHandler = false;

if (isLinux) {
  cmd = 'xprintidle';
} else if (process.platform === 'darwin') {
  // cmd = "echo $((`ioreg -c IOHIDSystem | sed -e '/HIDIdleTime/ !{ d' -e 't' -e '}' -e 's/.* = //g' -e 'q'` / 1000000))";
  cmd = 'echo $((`ioreg -c IOHIDSystem | sed -e \'/HIDIdleTime/ !{ d\' -e \'t\' -e \'}\' -e \'s/.* = //g\' -e \'q\'` / 1000000))';
} else {
  // directly execute cb, as we never want to be idle in those cases
  isNoHandler = true;
}

let isErrorShown = false;
export const getIdleTime = (cb) => {
  if (isNoHandler) {
    return cb(0);
  }

  exec(cmd, function (error, stdout) {
    if (error) {
      let msg = 'Something went wrong with the idle checker.';
      if (isLinux) {
        msg += ' You need to install ' + cmd + '.';
      }
      if (!isErrorShown) {
        errorHandler(msg);
        isErrorShown = true;
      }
      cb('NO_SUPPORT');
    }

    // command output is in stdout
    const idleTime = parseInt(stdout, 10);
    cb(idleTime);
  });
};
