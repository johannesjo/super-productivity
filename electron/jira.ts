import * as JiraApi from 'jira-client-fork';
import { getWin } from './main-window';
import { IPC_JIRA_CB_EVENT } from './ipc-events.const';

export const sendJiraRequest = (request) => {
  const mainWin = getWin();
  const config = request.config;
  const apiMethod = request.apiMethod;
  const args = request.arguments;
  const requestId = request.requestId;

  const matchPortRegEx = /:\d{2,4}/;

  // parse port from host and remove it
  if (config.host.match(matchPortRegEx)) {
    const match = matchPortRegEx.exec(config.host);
    config.host = config.host.replace(matchPortRegEx, '');
    config.port = parseInt(match[0].replace(':', ''), 10);
  }

  const matchProtocolRegEx = /(^[^:]+):\/\//;

  // parse protocol from host and remove it
  if (config.host.match(matchProtocolRegEx)) {
    const match = matchProtocolRegEx.exec(config.host);
    config.host = config.host
      .replace(matchProtocolRegEx, '')
      // remove trailing slash just in case
      .replace(/\/$/, '');

    config.protocol = match[1];
  } else {
    config.protocol = 'https';
  }

  const jira = new JiraApi({
    protocol: config.protocol,
    host: config.host,
    port: config.port,
    username: config.userName,
    password: config.password,
    apiVersion: 'latest',

    // also allow unauthorized certificates
    strictSSL: false
  });

  jira[apiMethod](...args)
    .then(res => {
      // console.log('JIRA_RESPONSE', error, res);
      mainWin.webContents.send(IPC_JIRA_CB_EVENT, {
        response: res,
        requestId: requestId
      });
    })
    .catch(err => {
      mainWin.webContents.send(IPC_JIRA_CB_EVENT, {
        error: err,
        requestId: requestId
      });
    });
};
