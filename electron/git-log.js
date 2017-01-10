module.exports = function (data, mainWindow) {
  'use strict';

  const exec = require('child_process').exec;
  let cmd = 'git --no-pager log --graph --pretty=format:\'%s (%cr) )<%an>\' --abbrev-commit --since=4am';

  exec(cmd, {
    cwd: data.cwd
  }, function (error, stdout) {
    mainWindow.webContents.send('GIT_LOG_RESPONSE', {
      stdout: stdout,
      requestId: data.requestId
    });
  });

};