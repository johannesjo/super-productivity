import { getWin } from './main-window';
import { IPC } from './ipc-events.const';

export const getGitLog = (data) => {
  const exec = require('child_process').exec;
  const cmd =
    "git --no-pager log --graph --pretty=format:'%s (%cr) <%an>' --abbrev-commit --since=4am";

  exec(
    cmd,
    {
      cwd: data.cwd,
    },
    (error, stdout) => {
      const mainWin = getWin();
      mainWin.webContents.send(IPC.GIT_LOG_RESPONSE, {
        stdout,
        requestId: data.requestId,
      });
    },
  );
};
