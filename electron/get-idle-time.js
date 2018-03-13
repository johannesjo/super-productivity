'use strict';
const errorHandler = require('./error-handler');
const exec = require('child_process').exec;
let cmd;

// todo check if programm exists
// command -v foo >/dev/null 2>&1 || { echo >&2 "I require foo but it's not installed.  Aborting."; exit 1; }
const isLinux = (process.platform === 'linux');

if (isLinux) {
  cmd = 'xprintidle';
} else if (process.platform === 'darwin') {
  cmd = "echo $((`ioreg -c IOHIDSystem | sed -e '/HIDIdleTime/ !{ d' -e 't' -e '}' -e 's/.* = //g' -e 'q'` / 1000000))";
} else {
  // directly execute cb, as we never want to be idle in those cases
  module.exports = (cb) => {
    cb(0);
  };
  return;
}

module.exports = (cb) => {
  exec(cmd, function(error, stdout) {
    if (error) {
      let msg = 'Something went wrong with the idle checker.';
      if (isLinux) {
        msg += ' You need to install ' + cmd + '.';
      }
      errorHandler(msg);
      cb('NO_SUPPORT');
    }

    // command output is in stdout
    const idleTime = parseInt(stdout, 10);
    cb(idleTime);
  });
};
