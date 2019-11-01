import * as JiraApi from 'jira-client-fork';
import {getWin} from './main-window';
import {IPC} from './ipc-events.const';
import {session} from 'electron';
import {JiraCfg} from '../src/app/features/issue/jira/jira';

export const sendJiraRequest = (request) => {
  const mainWin = getWin();
  const config = request.config;
  const apiMethod = request.apiMethod;
  const args = request.arguments;
  const requestId = request.requestId;


  const {host, protocol, port} = parseHostAndPort(config);

  const jira = new JiraApi({
    protocol,
    host,
    port,
    username: config.userName,
    password: config.password,
    apiVersion: 'latest',

    // also allow unauthorized certificates
    strictSSL: false
  });

  jira[apiMethod](...args)
    .then(res => {
      // console.log('JIRA_RESPONSE', error, res);
      mainWin.webContents.send(IPC.JIRA_CB_EVENT, {
        response: res,
        requestId,
      });
    })
    .catch(err => {
      mainWin.webContents.send(IPC.JIRA_CB_EVENT, {
        error: err,
        requestId,
      });
    });
};

export const setupRequestHeadersForImages = (jiraCfg: JiraCfg) => {
  const {host, protocol, port} = parseHostAndPort(jiraCfg);

  const _b64EncodeUnicode = (str) => {
    // tslint:disable-next-line
    return Buffer.from(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
      function toSolidBytes(match, p1) {
        return String.fromCharCode(+`0x${p1}`);
      })).toString('base64');
  };
  const encoded = _b64EncodeUnicode(`${jiraCfg.userName}:${jiraCfg.password}`);
  const filter = {
    urls: [`${protocol}://${host}/*`]
  };

  // thankfully only the last attached listener will be used
  // @see: https://electronjs.org/docs/api/web-request
  session.defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
    details.requestHeaders['authorization'] = `Basic ${encoded}`;
    callback({requestHeaders: details.requestHeaders});
  });
};

const MATCH_PROTOCOL_REG_EX = /(^[^:]+):\/\//;
const MATCH_PORT_REG_EX = /:\d{2,4}/;

const parseHostAndPort = (config: JiraCfg) => {
  let host = config.host;
  let protocol;
  let port;

  // parse port from host and remove it
  if (host.match(MATCH_PORT_REG_EX)) {
    const match = MATCH_PORT_REG_EX.exec(host);
    host = host.replace(MATCH_PORT_REG_EX, '');
    port = parseInt(match[0].replace(':', ''), 10);
  }

  // parse protocol from host and remove it
  if (host.match(MATCH_PROTOCOL_REG_EX)) {
    const match = MATCH_PROTOCOL_REG_EX.exec(host);
    host = host
      .replace(MATCH_PROTOCOL_REG_EX, '')
      // remove trailing slash just in case
      .replace(/\/$/, '');

    protocol = match[1];
  } else {
    protocol = 'https';
  }

  console.log({host, protocol, port});
  return {host, protocol, port};
};
