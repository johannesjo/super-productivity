const JiraApi = require('jira').JiraApi;

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

  let jira = new JiraApi('https', config.host, config.port, config.userName, config.password, 'latest');

  jira[apiMethod](...arguments, (error, res) => {
    //console.log('JIRA_RESPONSE', error, res);

    mainWindow.webContents.send('JIRA_RESPONSE', {
      error: error,
      response: res,
      requestId: requestId
    });
  });

};