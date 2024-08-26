import { Injectable } from '@angular/core';
import { OpenProjectCfg } from './open-project.model';
import { SnackService } from '../../../../core/snack/snack.service';
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
  HttpParams,
  HttpRequest,
} from '@angular/common/http';
import { Observable, ObservableInput, throwError } from 'rxjs';
import {
  OpenProjectOriginalStatus,
  OpenProjectOriginalWorkPackageReduced,
  OpenProjectWorkPackageSearchResult,
} from './open-project-api-responses';
import { catchError, filter, map } from 'rxjs/operators';
import {
  mapOpenProjectIssueFull,
  mapOpenProjectIssueReduced,
  mapOpenProjectIssueToSearchResult,
} from './open-project-issue/open-project-issue-map.util';
import {
  OpenProjectWorkPackage,
  OpenProjectWorkPackageReduced,
} from './open-project-issue/open-project-issue.model';
import { SearchResultItem } from '../../issue.model';
import { HANDLED_ERROR_PROP_STR } from '../../../../app.constants';
import { T } from '../../../../t.const';
import { throwHandledError } from '../../../../util/throw-handled-error';
import { ISSUE_PROVIDER_HUMANIZED, OPEN_PROJECT_TYPE } from '../../issue.const';
import { devError } from '../../../../util/dev-error';

@Injectable({
  providedIn: 'root',
})
export class OpenProjectApiService {
  constructor(
    private _snackService: SnackService,
    private _http: HttpClient,
  ) {}

  getById$(
    workPackageId: number,
    cfg: OpenProjectCfg,
  ): Observable<OpenProjectWorkPackage> {
    return this._sendRequest$(
      {
        url: `${cfg.host}/api/v3/work_packages/${workPackageId}`,
      },
      cfg,
    ).pipe(map((workPackage) => mapOpenProjectIssueFull(workPackage, cfg)));
  }

  searchIssueForRepo$(
    searchText: string,
    cfg: OpenProjectCfg,
  ): Observable<SearchResultItem[]> {
    return this._sendRequest$(
      {
        // see https://www.openproject.org/docs/api/endpoints/work-packages/
        url: `${cfg.host}/api/v3/projects/${cfg.projectId}/work_packages`,
        params: {
          pageSize: 100,
          // see: https://www.openproject.org/docs/api/filters/
          filters: JSON.stringify(
            [
              { subjectOrId: { operator: '**', values: [searchText] } },
              // only list open issues
              { status: { operator: 'o', values: [] } },
            ].concat(this._getScopeParamFilter(cfg)),
          ),
          // Default: [["id", "asc"]]
          sortBy: '[["updatedAt","desc"]]',
        },
      },
      cfg,
    ).pipe(
      map((res: OpenProjectWorkPackageSearchResult) => {
        return res && res._embedded.elements
          ? res._embedded.elements
              .map((workPackage: OpenProjectOriginalWorkPackageReduced) =>
                mapOpenProjectIssueReduced(workPackage, cfg),
              )
              .map(mapOpenProjectIssueToSearchResult)
          : [];
      }),
    );
  }

  getTransitionsForIssue$(
    workPackageId: string | number,
    lockVersion: number,
    cfg: OpenProjectCfg,
  ): Observable<OpenProjectOriginalStatus[]> {
    return this._sendRequest$(
      {
        method: 'POST',
        url: `${cfg.host}/api/v3/work_packages/${workPackageId}/form`,
        data: {
          lockVersion: lockVersion,
          _links: {},
        },
      },
      cfg,
    ).pipe(
      map((res: any) => res._embedded.schema.status._embedded.allowedValues),
      catchError((e) => {
        devError(e);
        return [];
      }),
    );
  }

  transitionIssue$(
    workPackage: OpenProjectWorkPackage,
    trans: OpenProjectOriginalStatus,
    cfg: OpenProjectCfg,
  ): Observable<any> {
    return this._sendRequest$(
      {
        url: `${cfg.host}/api/v3/work_packages/${workPackage.id}`,
        method: 'PATCH',
        data: {
          lockVersion: workPackage.lockVersion,
          percentageDone: workPackage.percentageDone,
          _links: {
            status: {
              href: trans._links.self.href,
            },
          },
        },
      },
      cfg,
    );
  }

  getActivitiesForTrackTime$(
    workPackageId: number,
    cfg: OpenProjectCfg,
  ): Observable<{ default: boolean; id: number; name: string; position: number }[]> {
    return this._sendRequest$(
      {
        method: 'POST',
        url: `${cfg.host}/api/v3/time_entries/form`,
        data: {
          _links: {
            workPackage: {
              href: '/api/v3/work_packages/' + workPackageId,
              title: '',
            },
            self: { href: null },
            // comment: { format: 'plain', raw: null, html: '' },
            // spentOn: '2021-09-20',
            // hours: 'PT1H',
            // activity: { href: '/api/v3/time_entries/activities/1', title: 'Management' },
          },
          id: 'new',
        },
      },
      cfg,
    ).pipe(
      map((res: any) => res._embedded.schema.activity._embedded.allowedValues),
      catchError((e) => {
        devError(e);
        return [];
      }),
    );
  }

  trackTime$({
    cfg,
    workPackage,
    spentOn,
    comment,
    hours,
    activityId,
  }: {
    spentOn: string; // 'YYYY-MM-DD'
    comment: string;
    activityId: number;
    workPackage: OpenProjectWorkPackage | OpenProjectWorkPackageReduced;
    hours: string; // ISO8601
    cfg: OpenProjectCfg;
  }): Observable<any> {
    return this._sendRequest$(
      {
        method: 'POST',
        url: `${cfg.host}/api/v3/time_entries`,
        data: {
          _links: {
            activity: {
              href: '/api/v3/time_entries/activities/' + activityId,
            },
            workPackage: {
              href: '/api/v3/work_packages/' + workPackage.id,
            },
          },
          comment: {
            raw: comment,
          },
          spentOn,
          hours,
        },
      },
      cfg,
    );
  }

  getLast100WorkPackagesForCurrentOpenProjectProject$(
    cfg: OpenProjectCfg,
  ): Observable<OpenProjectWorkPackageReduced[]> {
    return this._sendRequest$(
      {
        // see https://www.openproject.org/docs/api/endpoints/work-packages/
        url: `${cfg.host}/api/v3/projects/${cfg.projectId}/work_packages`,
        params: {
          pageSize: 100,
          // see: https://www.openproject.org/docs/api/filters/
          filters: JSON.stringify(
            [{ status: { operator: 'o', values: [] } }].concat(
              this._getScopeParamFilter(cfg),
            ),
          ),
          sortBy: '[["updatedAt","desc"]]',
        },
      },
      cfg,
    ).pipe(
      map((res: OpenProjectWorkPackageSearchResult) => {
        return res && res._embedded.elements
          ? res._embedded.elements.map(
              (workPackage: OpenProjectOriginalWorkPackageReduced) =>
                mapOpenProjectIssueReduced(workPackage, cfg),
            )
          : [];
      }),
    );
  }

  private _getScopeParamFilter(cfg: OpenProjectCfg): any[] {
    if (!cfg.scope) {
      return [];
    }

    if (cfg.scope === 'created-by-me') {
      return [{ author: { operator: '=', values: 'me' } }];
    } else if (cfg.scope === 'assigned-to-me') {
      return [{ assignee: { operator: '=', values: 'me' } }];
    } else {
      return [];
    }
  }

  private _checkSettings(cfg: OpenProjectCfg): void {
    if (!this._isValidSettings(cfg)) {
      this._snackService.open({
        type: 'ERROR',
        msg: T.F.ISSUE.S.ERR_NOT_CONFIGURED,
        translateParams: {
          issueProviderName: ISSUE_PROVIDER_HUMANIZED[OPEN_PROJECT_TYPE],
        },
      });
      throwHandledError('OpenProject: Not enough settings');
    }
  }

  private _isValidSettings(cfg: OpenProjectCfg): boolean {
    return (
      !!cfg &&
      !!cfg.host &&
      cfg.host.length > 0 &&
      !!cfg.projectId &&
      cfg.projectId.length > 0
    );
  }

  private _sendRequest$(
    params: HttpRequest<string> | any,
    cfg: OpenProjectCfg,
  ): Observable<any> {
    this._checkSettings(cfg);

    const p: HttpRequest<any> | any = {
      ...params,
      method: params.method || 'GET',
      headers: {
        ...(cfg.token ? { Authorization: `Basic ${btoa('apikey:' + cfg.token)}` } : {}),
        ...(params.headers ? params.headers : {}),
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
      // TODO remove type: 0 @see https://brianflove.com/2018/09/03/angular-http-client-observe-response/
      filter((res) => !(res === Object(res) && res.type === 0)),
      map((res: any) => (res && res.body ? res.body : res)),
      catchError(this._handleRequestError$.bind(this)),
    );
  }

  private _handleRequestError$(
    error: HttpErrorResponse,
    caught: Observable<unknown>,
  ): ObservableInput<unknown> {
    console.log(error);
    if (error.error instanceof ErrorEvent) {
      // A client-side or network error occurred. Handle it accordingly.
      this._snackService.open({
        type: 'ERROR',
        msg: T.F.ISSUE.S.ERR_NETWORK,
        translateParams: {
          issueProviderName: ISSUE_PROVIDER_HUMANIZED[OPEN_PROJECT_TYPE],
        },
      });
    } else if (error.error && error.error.message) {
      this._snackService.open({
        type: 'ERROR',
        msg: ISSUE_PROVIDER_HUMANIZED[OPEN_PROJECT_TYPE] + ': ' + error.error.message,
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
        msg: T.F.OPEN_PROJECT.S.ERR_UNKNOWN,
      });
    }
    if (error && error.message) {
      return throwError({ [HANDLED_ERROR_PROP_STR]: 'OpenProject: ' + error.message });
    }

    return throwError({ [HANDLED_ERROR_PROP_STR]: 'OpenProject: Api request failed.' });
  }
}
