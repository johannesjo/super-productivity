import { Injectable } from '@angular/core';
import shortid from 'shortid';
import { ChromeExtensionInterfaceService } from '../../core/chrome-extension-interface/chrome-extension-interface.service';

const IPC_JIRA_CB_EVENT = 'JIRA_RESPONSE';
const IPC_JIRA_MAKE_REQUEST_EVENT = 'JIRA';

// it's weird!!
const JIRA_DATE_FORMAT = 'YYYY-MM-DDTHH:mm:ss.SSZZ';

const MAX_RESULTS = 100;
const ISSUE_TYPE = 'JIRA';
const SUGGESTION_FIELDS_TO_GET = [
  'assignee',
  'summary',
  'description',
  'timeestimate',
  'timespent',
  'status',
  'attachment',
  'comment',
  'updated',
  'components',
];

@Injectable({
  providedIn: 'root'
})
export class JiraApiService {
  requestsLog = {};
  isPreventNextRequestAfterFailedAuth = false;
  IS_ELECTRON = false;
  IS_EXTENSION = true;
  REQUEST_TIMEOUT = 10000;
  cfg: any;

  constructor(private _chromeExtensionInterface: ChromeExtensionInterfaceService) {
    // set up callback listener for electron
    if (this.IS_ELECTRON) {
      // window.ipcRenderer.on(IPC_JIRA_CB_EVENT, (ev, res) => {
      //   handleResponse(res);
      // });
    } else if (this.IS_EXTENSION) {
      this._chromeExtensionInterface.addEventListener('SP_JIRA_RESPONSE', (ev, data) => {
        this._handleResponse(data);
      });
    }

    this.getSuggestions()
      .then((res) => console.log(res));
  }

  private _handleResponse(res) {
    // check if proper id is given in callback and if exists in requestLog
    if (res.requestId && this.requestsLog[res.requestId]) {
      const currentRequestPromise = this.requestsLog[res.requestId];
      // cancel timeout for request
      // setTimeout.cancel(currentRequestPromise.timeout);

      // resolve saved promise
      if (!res || res.error) {
        console.log('FRONTEND_REQUEST', currentRequestPromise);
        console.log('RESPONSE', res);
        const errorTxt = (res && res.error && (typeof res.error === 'string' && res.error) || res.error.name);
        console.log(errorTxt);

        currentRequestPromise.reject(res);
        if (res.error.statusCode && res.error.statusCode === 401) {
          this.isPreventNextRequestAfterFailedAuth = true;
        }

      } else {
        console.log('JIRA_RESPONSE', res);
        currentRequestPromise.resolve(res);
      }
      // delete entry for promise afterwards
      delete this.requestsLog[res.requestId];
    }
  }


  // SP_JIRA_REQUEST
  private _sendRequest(request) {
    // assign uuid to request to know which responsive belongs to which promise
    request.requestId = shortid();

    let promiseResolve;
    let promiseReject;

    const promise = new Promise((resolve, reject) => {
      promiseResolve = resolve;
      promiseReject = reject;
    });

    // save to request log
    this.requestsLog[request.requestId] = {
      resolve: promiseResolve,
      reject: promiseReject,
      requestMethod: request.apiMethod,
      clientRequest: request,
      timeout: setTimeout(() => {
        console.log('ERROR', 'Jira Request timed out for ' + request.apiMethod);
        // delete entry for promise
        delete this.requestsLog[request.requestId];
      }, this.REQUEST_TIMEOUT)
    };
    console.log(this.requestsLog);

    // send to electron
    if (this.IS_ELECTRON) {
      // window.ipcRenderer.send(IPC_JIRA_MAKE_REQUEST_EVENT, request);
    } else if (this.IS_EXTENSION) {
      this._chromeExtensionInterface.dispatchEvent('SP_JIRA_REQUEST', request);
    }

    return promise;
  }


  getSuggestions() {
    const options = {
      maxResults: MAX_RESULTS,
      fields: SUGGESTION_FIELDS_TO_GET
    };

    const request = {
      config: this.cfg,
      apiMethod: 'searchJira',
      arguments: [this.cfg.jqlQuery, options]
    };
    return this._sendRequest(request);
  }

  // static mapComments(issue) {
  // }
  //
  //
  // static mapComponents(issue) {
  // }
  //
  // static mapAttachments(issue) {
  // }
  //
  // static mapAndAddChangelogToTask(task, issue) {
  // }


  _makeIssueLink(issueKey) {
    let fullLink = this.cfg.host + '/browse/' + issueKey;
    const matchProtocolRegEx = /(^[^:]+):\/\//;
    if (!fullLink.match(matchProtocolRegEx)) {
      fullLink = 'https://' + fullLink;
    }
    return fullLink;
  }

  mapIssue(issue) {
  }

  isSufficientJiraSettings(settingsToTest) {
  }

  transformIssues(response) {
  }

  showTryAuthAgainToast() {
  }


  // Simple API Mappings
  // -------------------
  _addWorklog(originalKey, started, timeSpent, comment) {
  }

  searchUsers(userNameQuery) {
  }

  getTransitionsForIssue(task) {
  }

  getAutoAddedIssues() {
  }

  // Complex Functions
  // -----------------
  updateStatus(task, localType) {
  }

  updateIssueDescription(task) {
  }

  updateAssignee(task, assignee) {
  }

  checkUpdatesForTicket(task, isNoNotify) {
  }

  addWorklog(originalTask) {
  }

  transitionIssue(task, transitionObj, localType) {
  }

  checkForNewAndAddToBacklog() {
  }

  checkForUpdates(tasks) {
  }

  taskIsUpdatedHandler(updatedTask, originalTask) {
  }

  checkAndHandleUpdatesForTicket(task) {
  }
}
