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
import { OpenProjectWorkPackageReduced } from './open-project-issue.model';
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
                switchMap(() =>
                  forkJoin([
                    this._openProjectApiService.getLast100IssuesForRepo$(openProjectCfg),
                    this._taskService.getAllIssueIdsForProject(
                      pId,
                      OPEN_PROJECT_TYPE,
                    ) as Promise<number[]>,
                  ]),
                ),
                tap(
                  ([issues, allTaskOpenProjectIssueIds]: [
                    OpenProjectWorkPackageReduced[],
                    number[],
                  ]) => {
                    const issuesToAdd = issues
                      .filter((issue) => !allTaskOpenProjectIssueIds.includes(issue.id))
                      .sort((a, b) => a.id - b.id);
                    if (issuesToAdd?.length) {
                      this._importNewIssuesToBacklog(pId, issuesToAdd);
                    }
                  },
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
      map((cos) =>
        cos
          .filter(
            ({ cfg, task }: { cfg: OpenProjectCfg; task: TaskWithSubTasks }): boolean =>
              isOpenProjectEnabled(cfg) && cfg.isAutoPoll,
          )
          .map(({ task }: { cfg: OpenProjectCfg; task: TaskWithSubTasks }) => task),
      ),
      tap((openProjectTasks: TaskWithSubTasks[]) =>
        this._refreshIssues(openProjectTasks),
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
        svgIco: 'openProject',
        isSpinner: true,
      });
      openProjectTasks.forEach((task) =>
        this._issueService.refreshIssue(task, true, false),
      );
    }
  }

  private _importNewIssuesToBacklog(
    projectId: string,
    issuesToAdd: OpenProjectWorkPackageReduced[],
  ): void {
    issuesToAdd.forEach((issue) => {
      this._issueService.addTaskWithIssue(OPEN_PROJECT_TYPE, issue, projectId, true);
    });

    if (issuesToAdd.length === 1) {
      this._snackService.open({
        ico: 'cloud_download',
        translateParams: {
          issueText: `#${issuesToAdd[0].id} ${issuesToAdd[0].subject}`,
        },
        msg: T.F.OPEN_PROJECT.S.IMPORTED_SINGLE_ISSUE,
      });
    } else if (issuesToAdd.length > 1) {
      this._snackService.open({
        ico: 'cloud_download',
        translateParams: {
          issuesLength: issuesToAdd.length,
        },
        msg: T.F.OPEN_PROJECT.S.IMPORTED_MULTIPLE_ISSUES,
      });
    }
  }
}
