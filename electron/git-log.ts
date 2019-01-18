import { getWin } from './main-window';

export const getGitLog = function (data) {
  'use strict';

  const exec = require('child_process').exec;
  const cmd = 'git --no-pager log --graph --pretty=format:\'%s (%cr) <%an>\' --abbrev-commit --since=4am';

  exec(cmd, {
    cwd: data.cwd
  }, function (error, stdout) {
    const mainWin = getWin();
    mainWin.webContents.send('GIT_LOG_RESPONSE', {
      stdout: stdout,
      requestId: data.requestId
    });
  });

};
