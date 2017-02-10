const JiraApi = require('jira-client');

module.exports = (mainWindow, request) => {
  let config = request.config;
  let apiMethod = request.apiMethod;
  let arguments = request.arguments;
  let requestId = request.requestId;

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

    config.host = config.host.replace(matchProtocolRegEx, '');
    config.protocol = match[1];
  } else {
    config.protocol = 'https';
  }

  let jira = new JiraApi({
    protocol: config.protocol,
    host: config.host,
    port: config.port,
    username: config.userName,
    password: config.password,
    apiVersion: 'latest',
    strictSSL: true
  });

  jira[apiMethod](...arguments)
    .then(res => {
      //console.log('JIRA_RESPONSE', error, res);
      mainWindow.webContents.send('JIRA_RESPONSE', {
        response: res,
        requestId: requestId
      });
    })
    .catch(err => {
      mainWindow.webContents.send('JIRA_RESPONSE', {
        error: err,
        requestId: requestId
      });
    });
};