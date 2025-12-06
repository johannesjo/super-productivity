import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { LinearCfg } from './linear.model';
import { LinearIssue, LinearIssueReduced } from './linear-issue.model';
import { SnackService } from '../../../../core/snack/snack.service';
import { IPC } from '../../../../../../electron/shared-with-frontend/ipc-events.const';
import { HANDLED_ERROR_PROP_STR, IS_ELECTRON } from '../../../../app.constants';
import { IpcRendererEvent } from 'electron';
import { getErrorTxt } from '../../../../util/get-error-text';
import { IssueLog } from '../../../../core/log';
import { nanoid } from 'nanoid';
import { from } from 'rxjs';
import { concatMap, take } from 'rxjs/operators';

const LINEAR_API_URL = 'https://api.linear.app/graphql';

@Injectable({
  providedIn: 'root',
})
export class LinearApiService {
  private _snackService = inject(SnackService);

  private _requestsLog: { [key: string]: LinearRequestLogItem } = {};
  private _isInterfacesReadyIfNeeded$: Observable<boolean> = IS_ELECTRON
    ? of(true)
    : throwError(() => ({
        [HANDLED_ERROR_PROP_STR]: 'Linear: Only available in Electron environment',
      }));

  constructor() {
    // set up callback listener for electron
    if (IS_ELECTRON) {
      window.ea.on(IPC.LINEAR_CB_EVENT, (ev: IpcRendererEvent, res: any) => {
        this._handleResponse(res);
      });
    }
  }

  getById$(issueId: string, cfg: LinearCfg): Observable<LinearIssue> {
    const query = `
      query GetIssue($id: String!) {
        issue(id: $id) {
          id
          identifier
          number
          title
          description
          priority
          createdAt
          updatedAt
          completedAt
          canceledAt
          dueDate
          url
          state {
            id
            name
            type
          }
          team {
            id
            name
            key
          }
          assignee {
            id
            name
            email
            avatarUrl
          }
          creator {
            id
            name
          }
          labels(first: 50) {
            nodes {
              id
              name
              color
            }
          }
          comments(first: 50) {
            nodes {
              id
              body
              createdAt
              user {
                id
                name
                avatarUrl
              }
            }
          }
        }
      }
    `;

    return this._sendRequest$({
      linearReqCfg: {
        query: this._normalizeQuery(query),
        variables: { id: issueId },
        transform: (res: any) => {
          if (res?.data?.issue) {
            return this._mapLinearIssueToIssue(res.data.issue);
          }
          throw new Error('No issue data returned');
        },
      },
      cfg,
    });
  }

  /**
   * Search assigned issues with optional teamId and projectId filters.
   * @param searchTerm - Search string for title/identifier filtering (client-side)
   * @param cfg - Linear config
   * @param opts - Optional filters: teamId, projectId
   */
  searchIssues$(
    searchTerm: string,
    cfg: LinearCfg,
    opts?: { teamId?: string; projectId?: string },
  ): Observable<LinearIssueReduced[]> {
    const query = `
      query SearchIssues($first: Int!, $team: IssueTeamFilter, $project: IssueProjectFilter) {
        viewer {
          assignedIssues(
            first: $first,
            filter: {
              state: { type: { in: ["backlog", "unstarted", "started"] } },
              team: $team,
              project: $project
            }
          ) {
            nodes {
              id
              identifier
              number
              title
              updatedAt
              url
              state {
                id
                name
                type
              }
            }
          }
        }
      }
    `;

    // Build filter objects for variables, or set to null if not provided
    const variables: any = { first: 50 };
    variables.team = opts?.teamId ? { id: { eq: opts.teamId } } : null;
    variables.project = opts?.projectId ? { id: { eq: opts.projectId } } : null;

    return this._sendRequest$({
      linearReqCfg: {
        query: this._normalizeQuery(query),
        variables,
        transform: (res: any) => {
          let issues = res?.data?.viewer?.assignedIssues?.nodes || [];

          if (searchTerm.trim()) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            issues = issues.filter(
              (issue: any) =>
                issue.title.toLowerCase().includes(lowerSearchTerm) ||
                issue.identifier.toLowerCase().includes(lowerSearchTerm),
            );
          }

          return issues.map((issue: any) => this._mapLinearIssueToIssueReduced(issue));
        },
      },
      cfg,
    });
  }

  testConnection(cfg: LinearCfg): Observable<boolean> {
    const query = `
      query GetViewer {
        viewer {
          id
          name
        }
      }
    `;

    return this._sendRequest$({
      linearReqCfg: {
        query: this._normalizeQuery(query),
        variables: {},
        transform: () => true,
      },
      cfg,
    }).pipe(
      catchError((error) => {
        IssueLog.err('LINEAR_CONNECTION_TEST', error);
        return throwError(() => error);
      }),
    );
  }

  private _sendRequest$({
    linearReqCfg,
    cfg,
  }: {
    linearReqCfg: LinearRequestCfg;
    cfg: LinearCfg;
  }): Observable<any> {
    return this._isInterfacesReadyIfNeeded$.pipe(
      take(1),
      concatMap(() => {
        const requestId = `linear__graphql__${nanoid()}`;

        const headers = {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'Content-Type': 'application/json',
          Authorization: cfg.apiKey,
        };

        const requestInit = {
          method: 'POST',
          headers,
          body: JSON.stringify({
            query: linearReqCfg.query,
            variables: linearReqCfg.variables,
          }),
        };

        return this._sendRequestToExecutor$(
          requestId,
          LINEAR_API_URL,
          requestInit,
          linearReqCfg.transform,
        );
      }),
    );
  }

  private _sendRequestToExecutor$(
    requestId: string,
    url: string,
    requestInit: any,
    transform: any,
  ): Observable<any> {
    let promiseResolve;
    let promiseReject;
    const promise = new Promise((resolve, reject) => {
      promiseResolve = resolve;
      promiseReject = reject;
    });

    this._requestsLog[requestId] = {
      promiseResolve,
      promiseReject,
      requestId,
      requestInit,
      transform,
    };

    const requestToSend = { requestId, requestInit, url };

    if (IS_ELECTRON) {
      window.ea.makeLinearRequest(requestToSend);
    } else {
      return throwError(
        () => new Error('Linear: Only available in Electron environment'),
      );
    }

    return from(promise).pipe(
      catchError((err) => {
        IssueLog.log('LINEAR_REQUEST_ERROR', err);
        const errTxt = `Linear: ${getErrorTxt(err)}`;
        this._snackService.open({ type: 'ERROR', msg: errTxt });
        return throwError(() => ({ [HANDLED_ERROR_PROP_STR]: errTxt }));
      }),
    );
  }

  private _handleResponse(res: { response?: any; error?: any; requestId: string }): void {
    const { requestId, response, error } = res;
    const requestLog = this._requestsLog[requestId];

    if (!requestLog) {
      IssueLog.warn('LINEAR_RESPONSE_UNKNOWN_REQUEST', requestId);
      return;
    }

    delete this._requestsLog[requestId];

    if (error) {
      requestLog.promiseReject(error);
    } else {
      try {
        const result = requestLog.transform ? requestLog.transform(response) : response;
        requestLog.promiseResolve(result);
      } catch (err) {
        requestLog.promiseReject(err);
      }
    }
  }

  private _normalizeQuery(query: string): string {
    return query.replace(/\s+/g, ' ').trim();
  }

  private _mapLinearIssueToIssueReduced(issue: any): LinearIssueReduced {
    return {
      id: issue.id,
      identifier: issue.identifier,
      number: issue.number,
      title: issue.title,
      state: {
        name: issue.state.name,
        type: issue.state.type,
      },
      updatedAt: issue.updatedAt,
      url: issue.url,
    };
  }

  private _mapLinearIssueToIssue(issue: any): LinearIssue {
    return {
      id: issue.id,
      identifier: issue.identifier,
      number: issue.number,
      title: issue.title,
      state: {
        name: issue.state.name,
        type: issue.state.type,
      },
      updatedAt: issue.updatedAt,
      url: issue.url,
      description: issue.description || undefined,
      priority: issue.priority,
      createdAt: issue.createdAt,
      completedAt: issue.completedAt || undefined,
      canceledAt: issue.canceledAt || undefined,
      dueDate: issue.dueDate || undefined,
      assignee: issue.assignee
        ? {
            id: issue.assignee.id,
            name: issue.assignee.name,
            email: issue.assignee.email,
            avatarUrl: issue.assignee.avatarUrl,
          }
        : undefined,
      creator: {
        id: issue.creator.id,
        name: issue.creator.name,
      },
      team: {
        id: issue.team.id,
        name: issue.team.name,
        key: issue.team.key,
      },
      labels: (issue.labels?.nodes || []).map((label: any) => ({
        id: label.id,
        name: label.name,
        color: label.color,
      })),
      comments: (issue.comments?.nodes || []).map((comment: any) => ({
        id: comment.id,
        body: comment.body,
        createdAt: comment.createdAt,
        user: {
          id: comment.user.id,
          name: comment.user.name,
          avatarUrl: comment.user.avatarUrl,
        },
      })),
    };
  }
}

interface LinearRequestCfg {
  query: string;
  variables: Record<string, any>;
  transform?: (response: any) => any;
}

interface LinearRequestLogItem {
  promiseResolve: (value: any) => void;
  promiseReject: (reason?: any) => void;
  requestId: string;
  requestInit: any;
  transform?: (response: any) => any;
}
