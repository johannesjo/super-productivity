import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpRequest, HttpParams } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { catchError, filter, map, switchMap } from 'rxjs/operators';
import { ClickUpCfg } from './clickup.model';
import { ClickUpTask, ClickUpTaskReduced } from './clickup-issue.model';
import { SnackService } from '../../../../core/snack/snack.service';
import { handleIssueProviderHttpError$ } from '../../handle-issue-provider-http-error';
import { CLICKUP_TYPE } from '../../issue.const';
import { IssueLog } from '../../../../core/log';

const CLICKUP_API_URL = 'https://api.clickup.com/api/v2';

@Injectable({
  providedIn: 'root',
})
export class ClickUpApiService {
  private _snackService = inject(SnackService);
  private _http = inject(HttpClient);

  getById$(taskId: string, cfg: ClickUpCfg): Observable<ClickUpTask> {
    const params = new HttpParams()
      .set('include_markdown_description', 'true')
      .set('include_subtasks', 'true');

    return this._sendRequest$({
      url: `${CLICKUP_API_URL}/task/${taskId}`,
      params,
      cfg,
    }).pipe(map((res) => res as ClickUpTask));
  }

  getAuthorizedTeams$(cfg: ClickUpCfg): Observable<Array<{ id: string; name: string }>> {
    return this._sendRequest$({
      url: `${CLICKUP_API_URL}/team`,
      cfg,
    }).pipe(
      map((res: any) => {
        const teams = res.teams || [];
        return teams.map((team: any) => ({
          id: team.id,
          name: team.name,
        }));
      }),
    );
  }

  searchTasks$(searchTerm: string, cfg: ClickUpCfg): Observable<ClickUpTaskReduced[]> {
    // If teamIds are configured, search only in those teams
    if (cfg.teamIds && cfg.teamIds.length > 0) {
      return this._searchTasksInTeams$(searchTerm, cfg.teamIds, cfg);
    }

    // If no teamIds are configured, fetch all authorized teams and search across all of them
    return this.getAuthorizedTeams$(cfg).pipe(
      switchMap((teams) => {
        if (!teams || teams.length === 0) {
          IssueLog.warn('No authorized teams found');
          return of([]);
        }

        const teamIds = teams.map((team) => team.id);
        return this._searchTasksInTeams$(searchTerm, teamIds, cfg);
      }),
    );
  }

  private _searchTasksInTeams$(
    searchTerm: string,
    teamIds: string[],
    cfg: ClickUpCfg,
  ): Observable<ClickUpTaskReduced[]> {
    // Search tasks in all teams in parallel
    const searchObservables = teamIds.map((teamId) =>
      this._searchTasksInTeam$(searchTerm, teamId, cfg).pipe(
        catchError((err) => {
          IssueLog.warn(`Failed to search tasks in team ${teamId}:`, err);
          return of([]);
        }),
      ),
    );

    return forkJoin(searchObservables).pipe(
      map((results) => {
        // Flatten all results from all teams
        return results.flat();
      }),
    );
  }

  private _searchTasksInTeam$(
    searchTerm: string,
    teamId: string,
    cfg: ClickUpCfg,
  ): Observable<ClickUpTaskReduced[]> {
    let params = new HttpParams().set('page', '0').set('subtasks', 'true');

    // Add assignee filter if userId is available
    if (cfg.userId) {
      params = params.set('assignees[]', cfg.userId.toString());
    }

    return this._sendRequest$({
      url: `${CLICKUP_API_URL}/team/${teamId}/task`,
      params,
      cfg,
    }).pipe(
      map((res: any) => {
        let tasks = res.tasks || [];
        if (searchTerm.trim()) {
          const lowerSearchTerm = searchTerm.toLowerCase();
          tasks = tasks.filter(
            (task: any) =>
              task.name.toLowerCase().includes(lowerSearchTerm) ||
              (task.custom_id &&
                task.custom_id.toLowerCase().includes(lowerSearchTerm)) ||
              task.id.includes(lowerSearchTerm),
          );
        }
        return tasks.map(this._mapToReduced);
      }),
    );
  }

  getCurrentUser$(cfg: ClickUpCfg): Observable<any> {
    return this._sendRequest$({
      url: `${CLICKUP_API_URL}/user`,
      cfg,
    });
  }

  private _sendRequest$({
    url,
    method = 'GET',
    params = {},
    body,
    cfg,
  }: {
    url: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    params?: any;
    body?: any;
    cfg: ClickUpCfg;
  }): Observable<any> {
    const headers = new HttpHeaders({
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'Content-Type': 'application/json',
      Authorization: cfg.apiKey || '',
    });

    const req = new HttpRequest(method, url, body, {
      headers,
      params,
      reportProgress: false,
    });

    return this._http.request(req).pipe(
      filter((res: any) => !(res === Object(res) && res.type === 0)),
      map((res: any) => (res && res.body ? res.body : res)),
      catchError((err) =>
        handleIssueProviderHttpError$(CLICKUP_TYPE, this._snackService, err),
      ),
    );
  }

  private _mapToReduced(task: any): ClickUpTaskReduced {
    return {
      id: task.id,
      name: task.name,
      custom_id: task.custom_id,
      status: {
        status: task.status.status,
        type: task.status.type,
        color: task.status.color,
      },
      date_updated: task.date_updated,
      url: task.url,
    };
  }
}
