import {Injectable} from '@angular/core';
import shortid from 'shortid';
import {ChromeExtensionInterfaceService} from '../../../../core/chrome-extension-interface/chrome-extension-interface.service';
import {
  JIRA_ADDITIONAL_ISSUE_FIELDS,
  JIRA_DATETIME_FORMAT,
  JIRA_MAX_RESULTS,
  JIRA_REQUEST_TIMEOUT_DURATION
} from './jira.const';
import {ProjectService} from '../../../project/project.service';
import {
  mapIssueResponse,
  mapIssuesResponse,
  mapResponse,
  mapToSearchResults,
  mapTransitionResponse
} from './jira-issue/jira-issue-map.util';
import {JiraOriginalStatus, JiraOriginalTransition, JiraOriginalUser} from './jira-api-responses';
import {JiraCfg} from './jira.model';
import {IPC} from '../../../../../../electron/ipc-events.const';
import {SnackService} from '../../../../core/snack/snack.service';
import {HANDLED_ERROR_PROP_STR, IS_ELECTRON} from '../../../../app.constants';
import {loadFromSessionStorage, saveToSessionStorage} from '../../../../core/persistence/local-storage';
import {Observable, of, throwError} from 'rxjs';
import {SearchResultItem} from '../../issue.model';
import {catchError, concatMap, first, mapTo, shareReplay, take} from 'rxjs/operators';
import {JiraIssue, JiraIssueReduced} from './jira-issue/jira-issue.model';
import * as moment from 'moment';
import {BannerService} from '../../../../core/banner/banner.service';
import {BannerId} from '../../../../core/banner/banner.model';
import {T} from '../../../../t.const';
import {ElectronService} from '../../../../core/electron/electron.service';
import {stringify} from 'query-string';
import {fromPromise} from 'rxjs/internal-compatibility';
import {getJiraResponseErrorTxt} from '../../../../util/get-jira-response-error-text';
import {isOnline} from '../../../../util/is-online';

const BLOCK_ACCESS_KEY = 'SUP_BLOCK_JIRA_ACCESS';
const API_VERSION = 'latest';

interface JiraRequestLogItem {
  transform: (res: any, cfg: any) => any;
  requestInit: RequestInit;
  timeoutId: number;

  resolve(res: any): Promise<void>;

  reject(reason?: any): Promise<unknown>;
}

interface JiraRequestCfg {
  pathname: string;
  followAllRedirects?: boolean;
  method?: 'GET' | 'POST' | 'PUT';
  query?: {
    // TODO check if string[] works
    [key: string]: string | boolean | number | string[];
  };
  transform?: (res: any, jiraCfg?: JiraCfg) => any;
  body?: {};
}


@Injectable({
  providedIn: 'root',
})
export class JiraApiService {
  private _requestsLog: { [key: string]: JiraRequestLogItem } = {};
  private _isBlockAccess = loadFromSessionStorage(BLOCK_ACCESS_KEY);
  private _isExtension = false;
  private _isHasCheckedConnection = false;
  private _cfg: JiraCfg;
  private _cfg$: Observable<JiraCfg> = this._projectService.currentJiraCfg$;
  private _isInterfacesReadyIfNeeded$: Observable<boolean> = IS_ELECTRON
    ? of(true).pipe()
    : this._chromeExtensionInterface.onReady$.pipe(
      mapTo(true),
      shareReplay(1)
    );

  constructor(
    private _chromeExtensionInterface: ChromeExtensionInterfaceService,
    private _projectService: ProjectService,
    private _electronService: ElectronService,
    private _snackService: SnackService,
    private _bannerService: BannerService,
  ) {
    this._cfg$.subscribe((cfg: JiraCfg) => {
      this._cfg = cfg;
      if (IS_ELECTRON && this._isMinimalSettings(cfg)) {
        this._electronService.ipcRenderer.send(IPC.JIRA_SETUP_IMG_HEADERS, cfg);
      }
    });

    // set up callback listener for electron
    if (this._electronService.isElectronApp) {
      this._electronService.ipcRenderer.on(IPC.JIRA_CB_EVENT, (ev, res) => {
        this._handleResponse(res);
      });
    }

    this._chromeExtensionInterface.onReady$
      .subscribe(() => {
        this._isExtension = true;
        this._chromeExtensionInterface.addEventListener('SP_JIRA_RESPONSE', (ev, data) => {
          this._handleResponse(data);
        });
      });

    // fire a test request once there is enough config
    // we do this to avoid lots of request leading us to get kicked out of jira
    // TODO move to effect
    // const checkConnectionSub = this._isInterfacesReadyIfNeeded$.subscribe((cfg) => {
    //   if (!this._isHasCheckedConnection && this._isMinimalSettings(cfg) && cfg.isEnabled) {
    //     this.getCurrentUser$(cfg)
    //       .pipe(catchError((err) => {
    //         this._blockAccess();
    //         checkConnectionSub.unsubscribe();
    //         return throwError({[HANDLED_ERROR_PROP_STR]: err});
    //       }))
    //       .subscribe(() => {
    //         this.unblockAccess();
    //         checkConnectionSub.unsubscribe();
    //       });
    //   }
    // });
  }

  unblockAccess() {
    this._isBlockAccess = false;
    saveToSessionStorage(BLOCK_ACCESS_KEY, false);
  }

  issuePicker$(searchTerm: string, cfg: JiraCfg): Observable<SearchResultItem[]> {
    const searchStr = `${searchTerm}`;
    const jql = (cfg.searchJqlQuery ? `${encodeURI(cfg.searchJqlQuery)}` : '');

    return this._sendRequest$({
      pathname: 'issue/picker',
      followAllRedirects: true,
      query: {
        showSubTasks: true,
        showSubTaskParent: true,
        query: searchStr,
        currentJQL: jql
      },
      transform: mapToSearchResults
      // NOTE: we pass the cfg as well to avoid race conditions
    }, cfg);
  }

  listFields$(cfg: JiraCfg): Observable<any> {
    return this._sendRequest$({
      pathname: 'field',
    }, cfg);
  }

  findAutoImportIssues$(cfg: JiraCfg, isFetchAdditional?: boolean, maxResults: number = JIRA_MAX_RESULTS): Observable<JiraIssueReduced[]> {
    const options = {
      maxResults,
      fields: [
        ...JIRA_ADDITIONAL_ISSUE_FIELDS,
        ...(this._cfg.storyPointFieldId ? [this._cfg.storyPointFieldId] : [])
      ],
    };
    const searchQuery = this._cfg.autoAddBacklogJqlQuery;

    if (!searchQuery) {
      return throwError({[HANDLED_ERROR_PROP_STR]: 'JiraApi: No search query for auto import'});
    }

    return this._sendRequest$({
      transform: mapIssuesResponse,
      pathname: 'search',
      method: 'POST',
      body: {
        ...options,
        jql: searchQuery
      },
    }, cfg);
  }

  getIssueById$(issueId, cfg: JiraCfg): Observable<JiraIssue> {
    return this._getIssueById$(issueId, cfg, true);
  }

  getReducedIssueById$(issueId, cfg: JiraCfg): Observable<JiraIssueReduced> {
    return this._getIssueById$(issueId, cfg, false);
  }

  getCurrentUser$(cfg: JiraCfg, isForce = false): Observable<JiraOriginalUser> {
    return this._sendRequest$({
      pathname: `myself`,
      transform: mapResponse,
    }, cfg, isForce);
  }

  listStatus$(cfg: JiraCfg): Observable<JiraOriginalStatus[]> {
    return this._sendRequest$({
      pathname: `status`,
      transform: mapResponse,
    }, cfg);
  }


  getTransitionsForIssue$(issueId: string, cfg: JiraCfg): Observable<JiraOriginalTransition[]> {
    return this._sendRequest$({
      pathname: `issue/${issueId}/transitions`,
      method: 'GET',
      query: {
        expand: 'transitions.fields'
      },
      transform: mapTransitionResponse,
    }, cfg);
  }

  transitionIssue$(issueId: string, transitionId: string, cfg: JiraCfg): Observable<any> {
    return this._sendRequest$({
      pathname: `issue/${issueId}/transitions`,
      method: 'POST',
      body: {
        transition: {
          id: transitionId,
        }
      },
      transform: mapResponse,
    }, cfg);
  }

  updateAssignee$(issueId: string, accountId: string, cfg: JiraCfg): Observable<any> {
    return this._sendRequest$({
      pathname: `issue/${issueId}/assignee`,
      method: 'PUT',
      body: {
        accountId,
      },
    }, cfg);
  }

  addWorklog$({
                issueId,
                started,
                timeSpent,
                comment,
                cfg
              }: {
    issueId: string,
    started: string,
    timeSpent: number,
    comment: string,
    cfg: JiraCfg
  }): Observable<any> {
    const worklog = {
      started: moment(started).locale('en').format(JIRA_DATETIME_FORMAT),
      timeSpentSeconds: Math.floor(timeSpent / 1000),
      comment,
    };
    return this._sendRequest$({
      pathname: `issue/${issueId}/worklog`,
      method: 'POST',
      body: worklog,
      transform: mapResponse,
    }, cfg);
  }

  private _getIssueById$(issueId, cfg: JiraCfg, isGetChangelog = false): Observable<JiraIssue> {
    return this._sendRequest$({
      transform: mapIssueResponse,
      pathname: `issue/${issueId}`,
      query: {
        expand: isGetChangelog ? ['changelog', 'description'] : ['description']
      }
    }, cfg);
  }

  // Complex Functions


  // --------
  private _isMinimalSettings(settings: JiraCfg) {
    return settings && settings.host && settings.userName && settings.password
      && (IS_ELECTRON || this._isExtension);
  }

  private _sendRequest$(jiraReqCfg: JiraRequestCfg, cfg: JiraCfg, isForce = false): Observable<any> {
    return this._isInterfacesReadyIfNeeded$.pipe(
      take(1),
      concatMap(() => {
        // assign uuid to request to know which responsive belongs to which promise
        const requestId = `${jiraReqCfg.pathname}__${jiraReqCfg.method || 'GET'}__${shortid()}`;


        if (!isOnline()) {
          this._snackService.open({
            type: 'CUSTOM',
            msg: T.G.NO_CON,
            ico: 'cloud_off'
          });
          return throwError({[HANDLED_ERROR_PROP_STR]: 'Jira Offline ' + requestId});
        }

        if (!this._isMinimalSettings(cfg)) {
          this._snackService.open({
            type: 'ERROR',
            msg: (!IS_ELECTRON && !this._isExtension)
              ? T.F.JIRA.S.EXTENSION_NOT_LOADED
              : T.F.JIRA.S.INSUFFICIENT_SETTINGS,
          });
          return throwError({[HANDLED_ERROR_PROP_STR]: 'Insufficient Settings for Jira ' + requestId});
        }

        if (this._isBlockAccess && !isForce) {
          console.error('Blocked Jira Access to prevent being shut out');
          this._bannerService.open({
            id: BannerId.JiraUnblock,
            msg: T.F.JIRA.BANNER.BLOCK_ACCESS_MSG,
            svgIco: 'jira',
            action: {
              label: T.F.JIRA.BANNER.BLOCK_ACCESS_UNBLOCK,
              fn: () => this.unblockAccess()
            }
          });
          return throwError({[HANDLED_ERROR_PROP_STR]: 'Blocked access to prevent being shut out ' + requestId});
        }

        // BUILD REQUEST START
        // -------------------
        const requestInit = this._makeRequestInit(jiraReqCfg, cfg);

        const queryStr = jiraReqCfg.query
          ? `?${stringify(jiraReqCfg.query, {arrayFormat: 'comma'})}`
          : '';
        const base = `${cfg.host}/rest/api/${API_VERSION}`;
        const url = `${base}/${jiraReqCfg.pathname}${queryStr}`.trim();


        return this._sendRequestToExecutor$(requestId, url, requestInit, jiraReqCfg.transform);
        // NOTE: offline is sexier & easier than cache, but in case we change our mind...
        // const args = [requestId, url, requestInit, jiraReqCfg.transform];
        // return this._issueCacheService.cache(url, requestInit, this._sendRequestToExecutor$.bind(this), args);
      }));
  }

  private _sendRequestToExecutor$(requestId: string, url: string, requestInit: RequestInit, transform): Observable<any> {
    // TODO refactor to observable for request canceling etc
    let promiseResolve;
    let promiseReject;
    const promise = new Promise((resolve, reject) => {
      promiseResolve = resolve;
      promiseReject = reject;
    });

    // save to request log (also sets up timeout)
    this._requestsLog[requestId] = this._makeJiraRequestLogItem(promiseResolve, promiseReject, requestId, requestInit, transform);

    const requestToSend = {requestId, requestInit, url};
    if (this._electronService.isElectronApp) {
      this._electronService.ipcRenderer.send(IPC.JIRA_MAKE_REQUEST_EVENT, requestToSend);
    } else if (this._isExtension) {
      this._chromeExtensionInterface.dispatchEvent('SP_JIRA_REQUEST', requestToSend);
    }

    return fromPromise(promise)
      .pipe(
        catchError((err) => {
          console.log(err);
          console.log(getJiraResponseErrorTxt(err));
          const errTxt = `Jira: ${getJiraResponseErrorTxt(err)}`;
          this._snackService.open({type: 'ERROR', msg: errTxt});
          return throwError({[HANDLED_ERROR_PROP_STR]: errTxt});
        }),
        first(),
      );
  }

  private _makeRequestInit(jr: JiraRequestCfg, cfg: JiraCfg): RequestInit {
    const encoded = this._b64EncodeUnicode(`${cfg.userName}:${cfg.password}`);

    return {
      method: jr.method || 'GET',
      ...(jr.body ? {body: JSON.stringify(jr.body)} : {}),
      headers: {
        authorization: `Basic ${encoded}`,
        Cookie: '',
        'Content-Type': 'application/json'
      }
    };
  }

  private _makeJiraRequestLogItem(promiseResolve, promiseReject, requestId: string, requestInit: RequestInit, transform: any): JiraRequestLogItem {
    return {
      transform,
      resolve: promiseResolve,
      reject: promiseReject,
      // NOTE: only needed for debug
      requestInit,

      timeoutId: window.setTimeout(() => {
        console.log('ERROR', 'Jira Request timed out', requestInit);
        // delete entry for promise
        this._snackService.open({
          msg: T.F.JIRA.S.TIMED_OUT,
          type: 'ERROR',
        });
        this._requestsLog[requestId].reject('Request timed out');
        delete this._requestsLog[requestId];
      }, JIRA_REQUEST_TIMEOUT_DURATION)
    };
  }


  private _handleResponse(res) {
    // check if proper id is given in callback and if exists in requestLog
    if (res.requestId && this._requestsLog[res.requestId]) {
      const currentRequest = this._requestsLog[res.requestId];
      // cancel timeout for request
      window.clearTimeout(currentRequest.timeoutId);

      // resolve saved promise
      if (!res || res.error) {
        console.error('JIRA_RESPONSE_ERROR', res, currentRequest);
        // let msg =
        if (res.error &&
          (res.error.statusCode && res.error.statusCode === 401)
          || (res.error && res.error === 401)
        ) {
          this._blockAccess();
        }

        currentRequest.reject(res);
      } else {
        // console.log('JIRA_RESPONSE', res);
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

  private _b64EncodeUnicode(str) {
    if (typeof btoa === 'function') {
      return btoa(str);
    }
    throw new Error('Jira: btoo not supported');
  }
}
