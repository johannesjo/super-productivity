import { Injectable, inject } from '@angular/core';
import { OpenProjectCfg } from './open-project.model';
import { SnackService } from '../../../../core/snack/snack.service';
import { HttpClient, HttpHeaders, HttpParams, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
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
} from './open-project-issue-map.util';
import {
  OpenProjectAttachment,
  OpenProjectWorkPackage,
  OpenProjectWorkPackageReduced,
} from './open-project-issue.model';
import { SearchResultItem } from '../../issue.model';
import { T } from '../../../../t.const';
import { throwHandledError } from '../../../../util/throw-handled-error';
import { ISSUE_PROVIDER_HUMANIZED, OPEN_PROJECT_TYPE } from '../../issue.const';
import { devError } from '../../../../util/dev-error';
import { handleIssueProviderHttpError$ } from '../../handle-issue-provider-http-error';
import { OpenProjectFilterItem } from './open-project-filter.model';

@Injectable({
  providedIn: 'root',
})
export class OpenProjectApiService {
  private _snackService = inject(SnackService);
  private _http = inject(HttpClient);

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
    // OpenProject does not allow empty filter for subjectOrId, only send when searchText is present
    const filters: [OpenProjectFilterItem] = [{ status: { operator: 'o', values: [] } }];
    if (searchText?.trim()) {
      filters.push({ subjectOrId: { operator: '**', values: [searchText] } });
    }
    return this._sendRequest$(
      {
        // see https://www.openproject.org/docs/api/endpoints/work-packages/
        url: `${cfg.host}/api/v3/projects/${cfg.projectId}/work_packages`,
        params: {
          pageSize: 100,
          // see: https://www.openproject.org/docs/api/filters/
          filters: JSON.stringify(filters.concat(this._getScopeParamFilter(cfg))),
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

  uploadAttachment$(
    cfg: OpenProjectCfg,
    workPackageId: number | string,
    file: File,
    title: string,
  ): Observable<OpenProjectAttachment> {
    const formData = new FormData();
    formData.append('metadata', JSON.stringify({ fileName: title }));
    formData.append('file', file, file.name);

    return this._sendRequest$(
      {
        method: 'POST',
        url: `${cfg.host}/api/v3/work_packages/${workPackageId}/attachments`,
        data: formData,
        // NOTE: By passing an empty object for headers, we ensure that
        // _sendRequest$ does not set a default Content-Type, allowing
        // Angular's HttpClient to correctly set it for FormData (multipart/form-data with boundary).
        // The Authorization header will still be added by _sendRequest$ if a token is present.
        headers: {},
      },
      cfg,
    ).pipe(map((res) => res as OpenProjectAttachment));
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
      // Filter out HttpEventType.Sent (type: 0) events to only process actual responses
      filter((res) => !(res === Object(res) && res.type === 0)),
      map((res: any) => (res && res.body ? res.body : res)),
      catchError((err) =>
        handleIssueProviderHttpError$(OPEN_PROJECT_TYPE, this._snackService, err),
      ),
    );
  }
}
