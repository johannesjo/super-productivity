import { Injectable } from '@angular/core';
import shortid from 'shortid';
import { ChromeExtensionInterfaceService } from '../../../core/chrome-extension-interface/chrome-extension-interface.service';
import {
  JIRA_ADDITIONAL_ISSUE_FIELDS,
  JIRA_DATETIME_FORMAT,
  JIRA_MAX_RESULTS,
  JIRA_REDUCED_ISSUE_FIELDS,
  JIRA_REQUEST_TIMEOUT_DURATION
} from './jira.const';
import { ProjectService } from '../../project/project.service';
import {
  mapIssueResponse,
  mapIssuesResponse,
  mapResponse,
  mapToSearchResults,
  mapTransitionResponse
} from './jira-issue/jira-issue-map.util';
import { JiraOriginalStatus, JiraOriginalTransition, JiraOriginalUser } from './jira-api-responses';
import { JiraCfg } from './jira';
import { ElectronService } from 'ngx-electron';
import { IPC_JIRA_CB_EVENT, IPC_JIRA_MAKE_REQUEST_EVENT } from '../../../../../electron/ipc-events.const';
import { SnackService } from '../../../core/snack/snack.service';
import { IS_ELECTRON } from '../../../app.constants';
import { loadFromSessionStorage, saveToSessionStorage } from '../../../core/persistence/local-storage';
import { combineLatest, Observable, throwError } from 'rxjs';
import { SearchResultItem } from '../issue';
import { fromPromise } from 'rxjs/internal-compatibility';
import { catchError, share, take } from 'rxjs/operators';
import { JiraIssue } from './jira-issue/jira-issue.model';
import * as moment from 'moment';

const BLOCK_ACCESS_KEY = 'SUP_BLOCK_JIRA_ACCESS';

@Injectable({
  providedIn: 'root',
})
export class JiraApiService {
  private _requestsLog = {};
  private _isBlockAccess = loadFromSessionStorage(BLOCK_ACCESS_KEY);
  private _isExtension = false;
  private _isHasCheckedConnection = false;
  private _cfg: JiraCfg;
  private _isReady$: Observable<boolean>;

  constructor(
    private _chromeExtensionInterface: ChromeExtensionInterfaceService,
    private _projectService: ProjectService,
    private _electronService: ElectronService,
    private _snackService: SnackService,
  ) {
    this._projectService.currentJiraCfg$.subscribe((cfg: JiraCfg) => {
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
      this._projectService.currentJiraCfg$,
    ).subscribe(([isExtensionReady, cfg]) => {
      console.log('CHECK CON', isExtensionReady, cfg);

      if (!this._isHasCheckedConnection && this._isMinimalSettings(cfg) && cfg.isEnabled) {
        this.getCurrentUser()
          .pipe(catchError((err) => {
            this._blockAccess();
            checkConnectionSub.unsubscribe();
            return throwError(err);
          }))
          .subscribe(() => {
            this.unblockAccess();
            checkConnectionSub.unsubscribe();
          });
      }
    });
  }

  unblockAccess() {
    this._isBlockAccess = false;
    saveToSessionStorage(BLOCK_ACCESS_KEY, false);
  }

  search(searchTerm: string, isFetchAdditional?: boolean, maxResults: number = JIRA_MAX_RESULTS): Observable<SearchResultItem[]> {
    const options = {
      maxResults: maxResults,
      fields: isFetchAdditional ? JIRA_ADDITIONAL_ISSUE_FIELDS : JIRA_REDUCED_ISSUE_FIELDS,
    };
    const searchQuery = `text ~ "${searchTerm}"`
      + ' ' + (this._cfg.searchJqlQuery ? ` AND ${this._cfg.searchJqlQuery}` : '');

    return this._sendRequest({
      apiMethod: 'searchJira',
      arguments: [searchQuery, options],
      transform: mapToSearchResults
    });
  }

  findAutoImportIssues(isFetchAdditional?: boolean, maxResults: number = JIRA_MAX_RESULTS): Observable<JiraIssue[]> {
    const options = {
      maxResults: maxResults,
      fields: JIRA_ADDITIONAL_ISSUE_FIELDS,
    };
    const searchQuery = this._cfg.autoAddBacklogJqlQuery;

    if (!searchQuery) {
      return throwError('JiraApi: No search query for auto import');
    }

    return this._sendRequest({
      apiMethod: 'searchJira',
      arguments: [searchQuery, options],
      transform: mapIssuesResponse
    });
  }

  getIssueById(issueId, isGetChangelog = false): Observable<JiraIssue> {
    return this._sendRequest({
      apiMethod: 'findIssue',
      transform: mapIssueResponse,
      arguments: [issueId, ...(isGetChangelog ? ['changelog'] : [])]
    });
  }

  getCurrentUser(cfg?: JiraCfg): Observable<JiraOriginalUser> {
    return this._sendRequest({
      apiMethod: 'getCurrentUser',
      transform: mapResponse,
    }, cfg);
  }

  listStatus(): Observable<JiraOriginalStatus[]> {
    return this._sendRequest({
      apiMethod: 'listStatus',
      transform: mapResponse,
    });
  }


  getTransitionsForIssue(issueId: string): Observable<JiraOriginalTransition[]> {
    return this._sendRequest({
      apiMethod: 'listTransitions',
      transform: mapTransitionResponse,
      arguments: [issueId]
    });
  }

  transitionIssue(issueId, transitionId): Observable<any> {
    return this._sendRequest({
      apiMethod: 'transitionIssue',
      transform: mapResponse,
      arguments: [issueId, {
        transition: {
          id: transitionId,
        }
      }]
    });
  }

  updateAssignee(issueId, assignee) {
    return this._sendRequest({
      apiMethod: 'updateIssue',
      arguments: [issueId, {
        fields: {
          assignee: {
            name: assignee
          }
        }
      }]
    });
  }

  addWorklog(issueId: string, started: string, timeSpent: number, comment: string) {
    return this._sendRequest({
      apiMethod: 'addWorklog',
      transform: mapResponse,
      arguments: [
        issueId,
        {
          started: moment(started).format(JIRA_DATETIME_FORMAT),
          timeSpentSeconds: Math.floor(timeSpent / 1000),
          comment: comment,
        }
      ]
    });
  }

  // -----------------
  updateIssueDescription(task) {
  }


  // Complex Functions


  // --------
  private _isMinimalSettings(settings) {
    return settings && settings.host && settings.userName && settings.password
      && (IS_ELECTRON || this._isExtension);
  }

  // TODO refactor data madness of request and add types for everything
  private _sendRequest(request, cfg = this._cfg): Observable<any> {
    if (!this._isMinimalSettings(cfg)) {
      console.error('Not enough Jira settings. This should not happen!!!');
      return throwError(new Error('Insufficient Settings for Jira'));
    }

    if (this._isBlockAccess) {
      console.error('Blocked Jira Access to prevent being shut out');
      this._snackService.open({
        type: 'JIRA_UNBLOCK',
        message: 'Jira: To prevent shut out from api, access has been blocked. Check your settings!'
      });
      return throwError(new Error('Blocked access to prevent being shut out'));
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
    this._requestsLog[request.requestId] = {
      transform: request.transform,
      resolve: promiseResolve,
      reject: promiseReject,
      requestMethod: request.apiMethod,
      clientRequest: request,
      timeout: setTimeout(() => {
        console.log('ERROR', 'Jira Request timed out for ' + request.apiMethod);
        // delete entry for promise
        this._snackService.open({type: 'ERROR', message: 'Jira timed out'});
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
          isJiraEnabled: request.config.isJiraEnabled,
        }
      });
    }

    return fromPromise(promise)
      .pipe(
        catchError((err) => {
          this._snackService.open({type: 'ERROR', message: 'Jira: Something went wrong'});
          return throwError(err);
        }),
        share(),

        take(1),
      );
  }

  private _handleResponse(res) {
    // check if proper id is given in callback and if exists in requestLog
    if (res.requestId && this._requestsLog[res.requestId]) {
      const currentRequest = this._requestsLog[res.requestId];
      // cancel timeout for request
      clearTimeout(currentRequest.timeout);

      // resolve saved promise
      if (!res || res.error) {
        console.log('JIRA_RESPONSE_ERROR', res);
        console.log('FRONTEND_REQUEST_FOR_ERROR', currentRequest);

        const errorTxt = (res && res.error && (typeof res.error === 'string' && res.error || res.error.name || res.error));
        console.error(errorTxt);
        this._snackService.open({type: 'ERROR', message: 'Jira request failed: ' + errorTxt});
        currentRequest.reject(res);

        if (res.error &&
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
      console.warn('Jira: Response Request ID not existing');
    }
  }

  private _blockAccess() {
    this._isBlockAccess = true;
    saveToSessionStorage(BLOCK_ACCESS_KEY, true);
  }
}
