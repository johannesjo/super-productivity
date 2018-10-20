import { Injectable } from '@angular/core';
import shortid from 'shortid';
import { ChromeExtensionInterfaceService } from '../../core/chrome-extension-interface/chrome-extension-interface.service';
import { JIRA_MAX_RESULTS, JIRA_REQUEST_TIMEOUT_DURATION, JIRA_SUGGESTION_FIELDS_TO_GET } from './jira.const';
import { ProjectService } from '../../project/project.service';
import { mapIssuesResponse } from './jira-issue/jira-issue-map.util';
import { JiraIssue } from './jira-issue/jira-issue.model';

@Injectable({
  providedIn: 'root'
})
export class JiraApiService {
  requestsLog = {};
  isPreventNextRequestAfterFailedAuth = false;
  IS_ELECTRON = false;
  IS_EXTENSION = true;
  cfg: any = {};

  constructor(private _chromeExtensionInterface: ChromeExtensionInterfaceService,
              private _projectService: ProjectService) {
    this._projectService.currentJiraCfg$.subscribe((cfg) => {
      this.cfg = cfg;
    });

    // set up callback listener for electron
    if (this.IS_ELECTRON) {
      // window.ipcRenderer.on(IPC_JIRA_CB_EVENT, (ev, res) => {
      //   this._handleResponse(res);
      // });
    } else if (this.IS_EXTENSION) {
      this._chromeExtensionInterface.addEventListener('SP_JIRA_RESPONSE', (ev, data) => {
        this._handleResponse(data);
      });
    }
  }

  getSuggestions(cfg?) {
    const options = {
      maxResults: JIRA_MAX_RESULTS,
      fields: JIRA_SUGGESTION_FIELDS_TO_GET
    };

    return this._sendRequest({
      apiMethod: 'searchJira',
      arguments: [this.cfg.jqlQuery, options]
    }, cfg);
  }

  search(searchTerm): Promise<JiraIssue[]> {
    const options = {
      maxResults: JIRA_MAX_RESULTS,
      fields: JIRA_SUGGESTION_FIELDS_TO_GET
    };
    // const searchQuery = `summary ~ "${searchTerm}"${this.cfg.jqlQuery ? ' AND ' + this.cfg.jqlQuery : ''}`;
    const searchQuery = `summary ~ "${searchTerm}"${this.cfg.jqlQuery ? ' AND ' + this.cfg.jqlQuery : ''}`;
    console.log(searchQuery, this.cfg);

    return this._sendRequest({
      apiMethod: 'searchJira',
      arguments: [searchQuery, options],
      transform: mapIssuesResponse
    });
  }

  // INTERNAL
  // --------
  // TODO refactor data madness of request and add types for everything
  private _sendRequest(request, cfg = this.cfg): Promise<any> {
    // assign uuid to request to know which responsive belongs to which promise
    request.requestId = shortid();
    request.config = {...cfg, isJiraEnabled: true};


    // TODO refactor to observable for request canceling etc
    let promiseResolve;
    let promiseReject;

    const promise = new Promise((resolve, reject) => {
      promiseResolve = resolve;
      promiseReject = reject;
    });

    // save to request log
    this.requestsLog[request.requestId] = {
      transform: request.transform,
      resolve: promiseResolve,
      reject: promiseReject,
      requestMethod: request.apiMethod,
      clientRequest: request,
      timeout: setTimeout(() => {
        console.log('ERROR', 'Jira Request timed out for ' + request.apiMethod);
        // delete entry for promise
        delete this.requestsLog[request.requestId];
      }, JIRA_REQUEST_TIMEOUT_DURATION)
    };

    // send to electron
    if (this.IS_ELECTRON) {
      // window.ipcRenderer.send(IPC_JIRA_MAKE_REQUEST_EVENT, request);
    } else if (this.IS_EXTENSION) {
      this._chromeExtensionInterface.dispatchEvent('SP_JIRA_REQUEST', {
        requestId: request.requestId,
        apiMethod: request.apiMethod,
        arguments: request.arguments,
        config: {
          host: request.config.host,
          userName: request.config.userName,
          password: request.config.password,
          isJiraEnabled: request.config.isJiraEnabled,
        }
      });
    }

    return promise;
  }

  private _handleResponse(res) {
    // check if proper id is given in callback and if exists in requestLog
    if (res.requestId && this.requestsLog[res.requestId]) {
      const currentRequest = this.requestsLog[res.requestId];
      // cancel timeout for request
      clearTimeout(currentRequest.timeout);

      // resolve saved promise
      if (!res || res.error) {
        console.log('FRONTEND_REQUEST', currentRequest);
        console.log('RESPONSE', res);

        const errorTxt = (res && res.error && (typeof res.error === 'string' && res.error) || res.error.name);
        console.error(errorTxt);

        currentRequest.reject(res);
        if (res.error.statusCode && res.error.statusCode === 401) {
          this.isPreventNextRequestAfterFailedAuth = true;
        }

      } else {
        console.log('JIRA_RESPONSE', res);

        if (currentRequest.transform) {
          currentRequest.resolve(currentRequest.transform(res, this.cfg));
        } else {
          currentRequest.resolve(res);
        }
      }
      // delete entry for promise afterwards
      delete this.requestsLog[res.requestId];
    } else {
      console.warn('Jira: Response Request ID not existing');
    }
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
