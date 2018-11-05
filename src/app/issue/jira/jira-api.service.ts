import { Injectable } from '@angular/core';
import shortid from 'shortid';
import { ChromeExtensionInterfaceService } from '../../core/chrome-extension-interface/chrome-extension-interface.service';
import { JIRA_ADDITIONAL_ISSUE_FIELDS, JIRA_MAX_RESULTS, JIRA_REDUCED_ISSUE_FIELDS, JIRA_REQUEST_TIMEOUT_DURATION } from './jira.const';
import { ProjectService } from '../../project/project.service';
import { mapIssueResponse, mapIssuesResponse, mapResponse } from './jira-issue/jira-issue-map.util';
import { JiraOriginalStatus, JiraOriginalUser } from './jira-api-responses';
import { JiraIssue } from './jira-issue/jira-issue.model';
import { JiraCfg } from './jira';
import { ElectronService } from 'ngx-electron';
import { IPC_JIRA_CB_EVENT, IPC_JIRA_MAKE_REQUEST_EVENT } from '../../../ipc-events.const';

@Injectable({
  providedIn: 'root'
})
export class JiraApiService {
  requestsLog = {};
  isPreventNextRequestAfterFailedAuth = false;
  isExtension = false;
  cfg: any = {};

  constructor(
    private _chromeExtensionInterface: ChromeExtensionInterfaceService,
    private _projectService: ProjectService,
    private _electronService: ElectronService,
  ) {
    this._projectService.currentJiraCfg$.subscribe((cfg) => {
      this.cfg = cfg;
    });

    // set up callback listener for electron
    if (this._electronService.isElectronApp) {
      this._electronService.ipcRenderer.on(IPC_JIRA_CB_EVENT, (ev, res) => {
        this._handleResponse(res);
      });
    }

    this._chromeExtensionInterface.isReady$
      .subscribe(() => {
        this.isExtension = true;
        this._chromeExtensionInterface.addEventListener('SP_JIRA_RESPONSE', (ev, data) => {
          this._handleResponse(data);
        });
      });
  }


  search(searchTerm: string, isFetchAdditional?: boolean): Promise<JiraIssue[]> {
    const options = {
      maxResults: JIRA_MAX_RESULTS,
      fields: isFetchAdditional ? JIRA_ADDITIONAL_ISSUE_FIELDS : JIRA_REDUCED_ISSUE_FIELDS,
    };
    const searchQuery = `summary ~ "${searchTerm}"${this.cfg.jqlQuery ? ' AND ' + this.cfg.jqlQuery : ''}`;
    return this._sendRequest({
      apiMethod: 'searchJira',
      arguments: [searchQuery, options],
      transform: mapIssuesResponse
    });
  }

  getIssueById(issueId) {
    return this._sendRequest({
      apiMethod: 'findIssue',
      transform: mapIssueResponse,
      // arguments: [issueId, 'changelog']
      arguments: [issueId]
    });
  }

  getCurrentUser(cfg?: JiraCfg): Promise<JiraOriginalUser> {
    return this._sendRequest({
      apiMethod: 'getCurrentUser',
      transform: mapResponse,
    }, cfg);
  }

  listStatus(cfg?: JiraCfg): Promise<JiraOriginalStatus[]> {
    return this._sendRequest({
      apiMethod: 'listStatus',
      transform: mapResponse,
    }, cfg);
  }


  // INTERNAL
  // --------
  private _isMinimalSettings(settings) {
    return settings && settings.host && settings.userName && settings.password;
  }

  // TODO refactor data madness of request and add types for everything
  private _sendRequest(request, cfg = this.cfg): Promise<any> {
    if (!this._isMinimalSettings(cfg)) {
      console.error('Not enough Jira settings. This should not happen!!!');
      return Promise.reject(new Error('Insufficient Settings for Jira'));
    }

    // assign uuid to request to know which responsive belongs to which promise
    request.requestId = shortid();
    request.config = {...cfg, isJiraEnabled: true};
    request.arguments = request.arguments || [];


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
    if (this._electronService.isElectronApp) {
      this._electronService.ipcRenderer.send(IPC_JIRA_MAKE_REQUEST_EVENT, request);
    } else if (this.isExtension) {
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
