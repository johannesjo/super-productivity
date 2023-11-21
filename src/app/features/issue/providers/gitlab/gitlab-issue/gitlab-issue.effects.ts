import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { first } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { TaskService } from '../../../../tasks/task.service';
import { ProjectService } from '../../../../project/project.service';
import { GitlabApiService } from '../gitlab-api/gitlab-api.service';
import { GitlabCfg } from '../gitlab';
import { MatDialog } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { WorklogService } from '../../../../worklog/worklog.service';
import { BeforeFinishDayService } from '../../../../before-finish-day/before-finish-day.service';

@Injectable()
export class GitlabIssueEffects {
  // addWorkLogAtEndOfDay: any = createEffect(
  //   () => this._store.select(selectG).pipe(
  //
  //   { dispatch: false },
  // );
  // addWorkLogAtEndOfDay: any = createEffect(() =>
  //   this._actions$.pipe(ofType(BeforeFinishDayAction)),
  // );

  constructor(
    private readonly _actions$: Actions,
    private readonly _store: Store,
    private readonly _taskService: TaskService,
    private readonly _projectService: ProjectService,
    private readonly _gitlabApiService: GitlabApiService,
    private readonly _matDialog: MatDialog,
    private readonly _worklogService: WorklogService,
    private readonly _beforeFinishDayService: BeforeFinishDayService,
  ) {}

  private _getCfgOnce$(projectId: string): Observable<GitlabCfg> {
    return this._projectService.getGitlabCfgForProject$(projectId).pipe(first());
  }
}
