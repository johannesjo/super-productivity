import { Injectable } from '@angular/core';
import { createEffect } from '@ngrx/effects';
import { OpenProjectApiService } from '../open-project-api.service';
import { SnackService } from '../../../../../core/snack/snack.service';
import { TaskService } from '../../../../tasks/task.service';
import { ProjectService } from '../../../../project/project.service';
import { filter, first, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { IssueService } from '../../../issue.service';
import { forkJoin, Observable, timer } from 'rxjs';
import {
  OPEN_PROJECT_INITIAL_POLL_DELAY,
  OPEN_PROJECT_POLL_INTERVAL,
} from '../open-project.const';
import { TaskWithSubTasks } from '../../../../tasks/task.model';
import { T } from '../../../../../t.const';
import { WorkContextService } from '../../../../work-context/work-context.service';
import { OPEN_PROJECT_TYPE } from '../../../issue.const';
import { OpenProjectCfg } from '../open-project.model';
import { isOpenProjectEnabled } from '../is-open-project-enabled.util';
import { IssueEffectHelperService } from '../../../issue-effect-helper.service';

@Injectable()
export class OpenProjectIssueEffects {
  private _pollTimer$: Observable<any> = timer(
    OPEN_PROJECT_INITIAL_POLL_DELAY,
    OPEN_PROJECT_POLL_INTERVAL,
  );

  pollNewIssuesToBacklog$: Observable<any> = createEffect(
    () =>
      this._issueEffectHelperService.pollToBacklogTriggerToProjectId$.pipe(
        switchMap((pId) =>
          this._projectService.getOpenProjectCfgForProject$(pId).pipe(
            first(),
            filter(
              (openProjectCfg) =>
                isOpenProjectEnabled(openProjectCfg) && openProjectCfg.isAutoAddToBacklog,
            ),
            switchMap((openProjectCfg) =>
              this._pollTimer$.pipe(
                // NOTE: required otherwise timer stays alive for filtered actions
                takeUntil(this._issueEffectHelperService.pollToBacklogActions$),
                tap(() => console.log('OPEN_PROJECT_POLL_BACKLOG_CHANGES')),
                tap(() =>
                  this._issueService.checkAndImportNewIssuesToBacklogForProject(
                    OPEN_PROJECT_TYPE,
                    pId,
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    { dispatch: false },
  );

  private _updateIssuesForCurrentContext$: Observable<any> =
    this._workContextService.allTasksForCurrentContext$.pipe(
      first(),
      switchMap((tasks) => {
        const gitIssueTasks = tasks.filter(
          (task) => task.issueType === OPEN_PROJECT_TYPE,
        );
        return forkJoin(
          gitIssueTasks.map((task) => {
            if (!task.projectId) {
              throw new Error('No project for task');
            }
            return this._projectService.getOpenProjectCfgForProject$(task.projectId).pipe(
              first(),
              map((cfg) => ({
                cfg,
                task,
              })),
            );
          }),
        );
      }),
      map((eachTaskAndProjectOpenProjectCfg) =>
        // NOTE: this is necessary because for tag task lists every task could have a different config in place
        eachTaskAndProjectOpenProjectCfg
          .filter(
            ({ cfg }: { cfg: OpenProjectCfg; task: TaskWithSubTasks }): boolean =>
              isOpenProjectEnabled(cfg) && cfg.isAutoPoll,
          )
          .map(({ task }: { cfg: OpenProjectCfg; task: TaskWithSubTasks }) => task),
      ),
      tap((openProjectTasksToCheck: TaskWithSubTasks[]) =>
        this._refreshIssues(openProjectTasksToCheck),
      ),
    );

  pollIssueChangesForCurrentContext$: Observable<any> = createEffect(
    () =>
      this._issueEffectHelperService.pollIssueTaskUpdatesActions$.pipe(
        switchMap(() => this._pollTimer$),
        switchMap(() => this._updateIssuesForCurrentContext$),
      ),
    { dispatch: false },
  );

  constructor(
    private readonly _snackService: SnackService,
    private readonly _projectService: ProjectService,
    private readonly _openProjectApiService: OpenProjectApiService,
    private readonly _issueService: IssueService,
    private readonly _taskService: TaskService,
    private readonly _workContextService: WorkContextService,
    private readonly _issueEffectHelperService: IssueEffectHelperService,
  ) {}

  private _refreshIssues(openProjectTasks: TaskWithSubTasks[]): void {
    if (openProjectTasks && openProjectTasks.length > 0) {
      this._snackService.open({
        msg: T.F.OPEN_PROJECT.S.POLLING,
        svgIco: 'open_project',
        isSpinner: true,
      });
      openProjectTasks.forEach((task) =>
        this._issueService.refreshIssue(task, true, false),
      );
    }
  }
}
