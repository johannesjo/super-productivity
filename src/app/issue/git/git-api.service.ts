import { Injectable } from '@angular/core';
import shortid from 'shortid';
import { ChromeExtensionInterfaceService } from '../../core/chrome-extension-interface/chrome-extension-interface.service';
import { JIRA_ADDITIONAL_ISSUE_FIELDS, JIRA_MAX_RESULTS, JIRA_REDUCED_ISSUE_FIELDS, JIRA_REQUEST_TIMEOUT_DURATION } from './git.const';
import { ProjectService } from '../../project/project.service';
import { mapIssueResponse, mapIssuesResponse, mapResponse } from './git-issue/git-issue-map.util';
import { GitOriginalStatus, GitOriginalUser } from './git-api-responses';
import { GitIssue } from './git-issue/git-issue.model';
import { GitCfg } from './git';
import { ElectronService } from 'ngx-electron';
import { IPC_JIRA_CB_EVENT, IPC_JIRA_MAKE_REQUEST_EVENT } from '../../../ipc-events.const';
import { SnackService } from '../../core/snack/snack.service';
import { IS_ELECTRON } from '../../app.constants';
import { loadFromSessionStorage, saveToSessionStorage } from '../../core/persistence/local-storage';
import { combineLatest } from 'rxjs';

const BLOCK_ACCESS_KEY = 'SUP_BLOCK_JIRA_ACCESS';

@Injectable({
  providedIn: 'root'
})
export class GitApiService {
  private _requestsLog = {};
  private _isBlockAccess = loadFromSessionStorage(BLOCK_ACCESS_KEY);
  private _isExtension = false;
  private _isHasCheckedConnection = false;
  private _cfg: GitCfg;

  constructor(
    private _chromeExtensionInterface: ChromeExtensionInterfaceService,
    private _projectService: ProjectService,
    private _electronService: ElectronService,
    private _snackService: SnackService,
  ) {
    this._projectService.currentGitCfg$.subscribe((cfg: GitCfg) => {
      this._cfg = cfg;
    });

    // set up callback listener for electron
    if (this._electronService.isElectronApp) {
      this._electronService.ipcRenderer.on(IPC_JIRA_CB_EVENT, (ev, res) => {
        this._handleResponse(res);
      });
    }

    this._chromeExtensionInterface.isReady$
      .subscribe(() => {
        this._isExtension = true;
        this._chromeExtensionInterface.addEventListener('SP_JIRA_RESPONSE', (ev, data) => {
          this._handleResponse(data);
        });
      });

    // fire a test request once there is enough config
    const checkConnectionSub = combineLatest(
      this._chromeExtensionInterface.isReady$,
      this._projectService.currentGitCfg$,
    ).subscribe(([isExtensionReady, cfg]) => {
      if (!this._isHasCheckedConnection && this._isMinimalSettings(cfg)) {
        this.getCurrentUser()
          .then(() => {
            this.unblockAccess();
            checkConnectionSub.unsubscribe();
          })
          .catch(() => {
            this._blockAccess();
            checkConnectionSub.unsubscribe();
          });
      }
    });
  }

  unblockAccess() {
    this._isBlockAccess = false;
    saveToSessionStorage(BLOCK_ACCESS_KEY, false);
  }

  search(searchTerm: string, isFetchAdditional?: boolean, maxResults: number = JIRA_MAX_RESULTS): Promise<GitIssue[]> {
    const options = {
      maxResults: maxResults,
      fields: isFetchAdditional ? JIRA_ADDITIONAL_ISSUE_FIELDS : JIRA_REDUCED_ISSUE_FIELDS,
    };
    const searchQuery = `text ~ "${searchTerm}"`
      + ' ' + (this._cfg.searchJqlQuery ? ` AND ${this._cfg.searchJqlQuery}` : '');

    return this._sendRequest({
      apiMethod: 'searchGit',
      arguments: [searchQuery, options],
      transform: mapIssuesResponse
    });
  }

  getIssueById(issueId, isGetChangelog = false) {
    return this._sendRequest({
      apiMethod: 'findIssue',
      transform: mapIssueResponse,
      arguments: [issueId, ...(isGetChangelog ? ['changelog'] : [])]
    });
  }

  getCurrentUser(cfg?: GitCfg): Promise<GitOriginalUser> {
    return this._sendRequest({
      apiMethod: 'getCurrentUser',
      transform: mapResponse,
    }, cfg);
  }

  listStatus(cfg?: GitCfg): Promise<GitOriginalStatus[]> {
    return this._sendRequest({
      apiMethod: 'listStatus',
      transform: mapResponse,
    }, cfg);
  }


  // INTERNAL

  isSufficientGitSettings(settingsToTest) {
  }

  transformIssues(response) {
  }

  showTryAuthAgainToast() {
  }

  // -------------------
  _addWorklog(originalKey, started, timeSpent, comment) {
  }

  searchUsers(userNameQuery) {
  }

  getTransitionsForIssue(task) {
  }


  // Simple API Mappings

  getAutoAddedIssues() {
  }

  // -----------------
  updateStatus(task, localType) {
  }

  updateIssueDescription(task) {
  }

  updateAssignee(task, assignee) {
  }

  // Complex Functions

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

  // --------
  private _isMinimalSettings(settings) {
    return settings && settings.host && settings.userName && settings.password
      && (IS_ELECTRON || this._isExtension);
  }

  // TODO refactor data madness of request and add types for everything
  private _sendRequest(request, cfg = this._cfg): Promise<any> {
    if (!this._isMinimalSettings(cfg)) {
      console.error('Not enough Git settings. This should not happen!!!');
      return Promise.reject(new Error('Insufficient Settings for Git'));
    }

    if (this._isBlockAccess) {
      console.error('Blocked Git Access to prevent being shut out');
      this._snackService.open({
        type: 'JIRA_UNBLOCK',
        message: 'Git: To prevent shut out from api, access has been blocked. Check your settings!'
      });
      return Promise.reject(new Error('Blocked access to prevent being shut out'));
    }

    // assign uuid to request to know which responsive belongs to which promise
    request.requestId = shortid();
    request.config = {...cfg, isGitEnabled: true};
    request.arguments = request.arguments || [];


    // TODO refactor to observable for request canceling etc
    let promiseResolve;
    let promiseReject;

    const promise = new Promise((resolve, reject) => {
      promiseResolve = resolve;
      promiseReject = reject;
    });

    // save to request log
    this._requestsLog[request.requestId] = {
      transform: request.transform,
      resolve: promiseResolve,
      reject: promiseReject,
      requestMethod: request.apiMethod,
      clientRequest: request,
      timeout: setTimeout(() => {
        console.log('ERROR', 'Git Request timed out for ' + request.apiMethod);
        // delete entry for promise
        this._snackService.open({type: 'ERROR', message: 'Git timed out'});
        this._requestsLog[request.requestId].reject('Request timed out');
        delete this._requestsLog[request.requestId];
      }, JIRA_REQUEST_TIMEOUT_DURATION)
    };

    // send to electron
    if (this._electronService.isElectronApp) {
      this._electronService.ipcRenderer.send(IPC_JIRA_MAKE_REQUEST_EVENT, request);
    } else if (this._isExtension) {
      this._chromeExtensionInterface.dispatchEvent('SP_JIRA_REQUEST', {
        requestId: request.requestId,
        apiMethod: request.apiMethod,
        arguments: request.arguments,
        config: {
          host: request.config.host,
          userName: request.config.userName,
          password: request.config.password,
          isGitEnabled: request.config.isGitEnabled,
        }
      });
    }

    return promise;
  }

  private _handleResponse(res) {
    // check if proper id is given in callback and if exists in requestLog
    if (res.requestId && this._requestsLog[res.requestId]) {
      const currentRequest = this._requestsLog[res.requestId];
      // cancel timeout for request
      clearTimeout(currentRequest.timeout);

      // resolve saved promise
      if (!res || res.error) {
        console.log('FRONTEND_REQUEST', currentRequest);
        console.log('RESPONSE', res);

        const errorTxt = (res && res.error && (typeof res.error === 'string' && res.error) || res.error.name);
        console.error(errorTxt);
        currentRequest.reject(res);
        this._snackService.open({type: 'ERROR', message: 'Git request failed: ' + errorTxt});

        if (
          (res.error.statusCode && res.error.statusCode === 401)
          || (res.error && res.error === 401)
        ) {
          this._blockAccess();
        }

      } else {
        console.log('JIRA_RESPONSE', res);

        if (currentRequest.transform) {
          currentRequest.resolve(currentRequest.transform(res, this._cfg));
        } else {
          currentRequest.resolve(res);
        }
      }
      // delete entry for promise afterwards
      delete this._requestsLog[res.requestId];
    } else {
      console.warn('Git: Response Request ID not existing');
    }
  }

  private _blockAccess() {
    this._isBlockAccess = true;
    saveToSessionStorage(BLOCK_ACCESS_KEY, true);
  }
}
