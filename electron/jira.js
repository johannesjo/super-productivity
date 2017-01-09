const JiraApi = require('jira').JiraApi;

module.exports = (mainWindow, request) => {
  //console.log(request);

  let config = request.config;
  let apiMethod = request.apiMethod;
  let arguments = request.arguments;
  let requestId = request.requestId;


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