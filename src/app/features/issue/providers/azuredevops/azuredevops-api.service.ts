import { Injectable } from '@angular/core';
import { AzuredevopsCfg } from './azuredevops.model';
import { SnackService } from '../../../../core/snack/snack.service';
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
  HttpParams,
  HttpRequest,
} from '@angular/common/http';
import { AZUREDEVOPS_API_BASE_URL } from './azuredevops.const';
import { Observable, ObservableInput, of, throwError } from 'rxjs';
import {
  AzuredevopsWIQLSearchResult,
  AzuredevopsWorkItem,
  AzuredevopsGetWorkItemsResponse,
} from './azuredevops-api-responses.d';
import { catchError, filter, map, switchMap } from 'rxjs/operators';
import {
  mapAzuredevopsIssue,
  mapAzuredevopsReducedIssueFromWIQL,
} from './azuredevops-issue/azuredevops-issue-map.util';
import {
  AzuredevopsIssue,
  AzuredevopsIssueReduced,
} from './azuredevops-issue/azuredevops-issue.model';
import { HANDLED_ERROR_PROP_STR } from '../../../../app.constants';
import { T } from '../../../../t.const';
import { throwHandledError } from '../../../../util/throw-handled-error';
import { AZUREDEVOPS_TYPE, ISSUE_PROVIDER_HUMANIZED } from '../../issue.const';

const BASE = AZUREDEVOPS_API_BASE_URL;
const WIT_FIELDS_STR: string =
  'System.Id,System.WorkItemType,System.State,System.CreatedDate,System.ChangedDate,System.Title,System.Description';

@Injectable({
  providedIn: 'root',
})
export class AzuredevopsApiService {
  constructor(private _snackService: SnackService, private _http: HttpClient) {}

  getById$(issueId: number, cfg: AzuredevopsCfg): Observable<AzuredevopsIssue> {
    return this._sendRequest$(
      {
        url: `${BASE}/${cfg.organization}/${cfg.project}/_apis/wit/workitems/${issueId}?fields=${WIT_FIELDS_STR}&api-version=7.1-preview.3`,
      },
      cfg,
    ).pipe(
      map((res: AzuredevopsWorkItem) => {
        return mapAzuredevopsIssue(res);
      }),
    );
  }

  wiql$(cfg: AzuredevopsCfg, query: string): Observable<AzuredevopsWIQLSearchResult> {
    return this._sendRequest$(
      {
        url: `${BASE}/${cfg.organization}/${cfg.project}/_apis/wit/wiql?api-version=7.1-preview.2`,
        method: 'POST',
        data: { query },
      },
      cfg,
    );
  }

  getImportToBacklogIssuesFromWIQL(
    cfg: AzuredevopsCfg,
  ): Observable<AzuredevopsIssueReduced[]> {
    const owner = cfg.filterUsername;
    return this.wiql$(
      cfg,
      ` Select [System.Id], [System.Title], [System.State] From WorkItems Where [State] <> 'Closed' AND [State] <> 'Removed' AND [System.AssignedTo] contains '${owner}' order by [Microsoft.VSTS.Common.Priority] asc, [System.CreatedDate] desc `,
    ).pipe(
      switchMap((res: AzuredevopsWIQLSearchResult) =>
        res && res.workItems ? this._getWIT(cfg, res) : of([]),
      ),
    );
  }

  private _getWIT(
    cfg: AzuredevopsCfg,
    wit: AzuredevopsWIQLSearchResult,
  ): Observable<AzuredevopsIssueReduced[]> {
    if (!wit.workItems.length) {
      return of([]);
    }
    const ids = wit.workItems.map((i) => i.id);
    return this._sendRequest$(
      {
        url: `${BASE}/${cfg.organization}/${cfg.project}/_apis/wit/workitems?ids=${ids}&fields=${WIT_FIELDS_STR}&api-version=7.1-preview.3`,
      },
      cfg,
    ).pipe(
      map((res: AzuredevopsGetWorkItemsResponse) =>
        res && res.value && res.count > 0
          ? res.value.map(mapAzuredevopsReducedIssueFromWIQL)
          : [],
      ),
    );
  }

  private _checkSettings(cfg: AzuredevopsCfg): void {
    if (!this._isValidSettings(cfg)) {
      this._snackService.open({
        type: 'ERROR',
        msg: T.F.ISSUE.S.ERR_NOT_CONFIGURED,
        translateParams: {
          issueProviderName: ISSUE_PROVIDER_HUMANIZED[AZUREDEVOPS_TYPE],
        },
      });
      throwHandledError('Azuredevops: Not enough settings');
    }
  }

  private _isValidSettings(cfg: AzuredevopsCfg): boolean {
    return (
      !!cfg &&
      !!cfg.organization &&
      cfg.organization.length > 0 &&
      !!cfg.project &&
      cfg.project.length > 0
    );
  }

  private _sendRequest$(
    params: HttpRequest<string> | any,
    cfg: AzuredevopsCfg,
  ): Observable<any> {
    this._checkSettings(cfg);

    const p: HttpRequest<any> | any = {
      ...params,
      method: params.method || 'GET',
      headers: {
        ...(cfg.token
          ? { Authorization: 'Basic ' + this._b64EncodeUnicode(':' + cfg.token) }
          : {}),
        ...(params.headers ? params.headers : {}),
        ...{ 'Content-Type': 'application/json' },
      },
    };
    const bodyArg = params.data ? [params.data] : [];
    const allArgs = [
      ...bodyArg,
      {
        headers: new HttpHeaders(p.headers),
        params: new HttpParams({ fromObject: p.params }),
        reportProgress: false,
        observe: 'response',
        responseType: params.responseType,
      },
    ];
    const req = new HttpRequest(p.method, p.url, ...allArgs);
    return this._http.request(req).pipe(
      filter((res) => !(res === Object(res) && res.type === 0)),
      map((res: any) => (res && res.body ? res.body : res)),
      catchError(this._handleRequestError$.bind(this)),
    );
  }

  private _handleRequestError$(
    error: HttpErrorResponse,
    caught: Observable<unknown>,
  ): ObservableInput<unknown> {
    if (error.error instanceof ErrorEvent) {
      // A client-side or network error occurred. Handle it accordingly.
      this._snackService.open({
        type: 'ERROR',
        msg: T.F.ISSUE.S.ERR_NETWORK,
        translateParams: {
          issueProviderName: ISSUE_PROVIDER_HUMANIZED[AZUREDEVOPS_TYPE],
        },
      });
    } else if (error.error && error.error.message) {
      this._snackService.open({
        type: 'ERROR',
        msg: ISSUE_PROVIDER_HUMANIZED[AZUREDEVOPS_TYPE] + ': ' + error.error.message,
      });
    } else {
      // The backend returned an unsuccessful response code.
      this._snackService.open({
        type: 'ERROR',
        translateParams: {
          errorMsg:
            (error.error && (error.error.name || error.error.statusText)) ||
            error.toString(),
          statusCode: error.status,
        },
        msg: T.F.AZUREDEVOPS.S.ERR_UNKNOWN,
      });
    }
    if (error && error.message) {
      return throwError({ [HANDLED_ERROR_PROP_STR]: 'Azuredevops: ' + error.message });
    }

    return throwError({ [HANDLED_ERROR_PROP_STR]: 'Azuredevops: Api request failed.' });
  }
  private _b64EncodeUnicode(str: string): string {
    if (typeof (btoa as any) === 'function') {
      return btoa(str);
    }
    throw new Error('Azure Devops: btoa not supported');
  }
}
