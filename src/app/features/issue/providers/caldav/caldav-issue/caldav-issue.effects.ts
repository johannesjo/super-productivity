import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { SnackService } from '../../../../../core/snack/snack.service';
import { TaskService } from '../../../../tasks/task.service';
import { ProjectService } from '../../../../project/project.service';
import { concatMap, filter, first, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { IssueService } from '../../../issue.service';
import { forkJoin, Observable, timer } from 'rxjs';
import { Task, TaskWithSubTasks } from 'src/app/features/tasks/task.model';
import { T } from '../../../../../t.const';
import { WorkContextService } from '../../../../work-context/work-context.service';
import { CALDAV_TYPE } from '../../../issue.const';
import { IssueEffectHelperService } from '../../../issue-effect-helper.service';
import { CALDAV_INITIAL_POLL_DELAY, CALDAV_POLL_INTERVAL } from '../caldav.const';
import { isCaldavEnabled } from '../is-caldav-enabled.util';
import { CaldavClientService } from '../caldav-client.service';
import { CaldavIssueReduced } from './caldav-issue.model';
import { CaldavCfg } from '../caldav.model';
import { TaskActionTypes, UpdateTask } from '../../../../tasks/store/task.actions';

@Injectable()
export class CaldavIssueEffects {
  @Effect({ dispatch: false })
  checkForDoneTransition$: Observable<any> = this._actions$.pipe(
    ofType(TaskActionTypes.UpdateTask),
    filter((a: UpdateTask): boolean => 'isDone' in a.payload.task.changes),
    concatMap((a: UpdateTask) =>
      this._taskService.getByIdOnce$(a.payload.task.id as string),
    ),
    filter((task: Task) => task && task.issueType === CALDAV_TYPE),
    concatMap((task: Task) => {
      if (!task.projectId) {
        throw new Error('No projectId for task');
      }
      return this._getCfgOnce$(task.projectId).pipe(
        map((caldavCfg) => ({ caldavCfg, task })),
      );
    }),
    filter(
      ({ caldavCfg: caldavCfg, task }) =>
        isCaldavEnabled(caldavCfg) && caldavCfg.isTransitionIssuesEnabled,
    ),
    concatMap(({ caldavCfg: caldavCfg, task }) => {
      return this._handleTransitionForIssue$(caldavCfg, task);
    }),
  );

  private _pollTimer$: Observable<any> = timer(
    CALDAV_INITIAL_POLL_DELAY,
    CALDAV_POLL_INTERVAL,
  );

  @Effect({ dispatch: false })
  pollNewIssuesToBacklog$: Observable<any> = this._issueEffectHelperService.pollToBacklogTriggerToProjectId$.pipe(
    switchMap((pId) =>
      this._projectService.getCaldavCfgForProject$(pId).pipe(
        first(),
        filter((caldavCfg) => isCaldavEnabled(caldavCfg) && caldavCfg.isAutoAddToBacklog),
        switchMap((caldavCfg) =>
          this._pollTimer$.pipe(
            // NOTE: required otherwise timer stays alive for filtered actions
            takeUntil(this._issueEffectHelperService.pollToBacklogActions$),
            tap(() => console.log('CALDAV_POLL_BACKLOG_CHANGES')),
            switchMap(() =>
              forkJoin([
                this._caldavClientService.getOpenTasks$(caldavCfg),
                this._taskService.getAllIssueIdsForProject(pId, CALDAV_TYPE) as Promise<
                  string[]
                >,
              ]),
            ),
            tap(([issues, allTaskCaldavIssueIds]: [CaldavIssueReduced[], string[]]) => {
              const issuesToAdd = issues.filter(
                (issue) => !allTaskCaldavIssueIds.includes(issue.id),
              );
              console.log('issuesToAdd', issuesToAdd);
              if (issuesToAdd?.length) {
                this._importNewIssuesToBacklog(pId, issuesToAdd);
              }
            }),
          ),
        ),
      ),
    ),
  );
  private _updateIssuesForCurrentContext$: Observable<any> =
    this._workContextService.allTasksForCurrentContext$.pipe(
      first(),
      switchMap((tasks) => {
        const caldavIssueTasks = tasks.filter((task) => task.issueType === CALDAV_TYPE);
        return forkJoin(
          caldavIssueTasks.map((task) => {
            if (!task.projectId) {
              throw new Error('No project for task');
            }
            return this._projectService.getCaldavCfgForProject$(task.projectId).pipe(
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
            ({ cfg, task }: { cfg: CaldavCfg; task: TaskWithSubTasks }): boolean =>
              isCaldavEnabled(cfg) && cfg.isAutoPoll,
          )
          .map(({ task }: { cfg: CaldavCfg; task: TaskWithSubTasks }) => task),
      ),
      tap((caldavTasks: TaskWithSubTasks[]) => this._refreshIssues(caldavTasks)),
    );
  @Effect({ dispatch: false })
  pollIssueChangesForCurrentContext$: Observable<any> = this._issueEffectHelperService.pollIssueTaskUpdatesActions$.pipe(
    switchMap(() => this._pollTimer$),
    switchMap(() => this._updateIssuesForCurrentContext$),
  );

  constructor(
    private readonly _actions$: Actions,
    private readonly _snackService: SnackService,
    private readonly _projectService: ProjectService,
    private readonly _caldavClientService: CaldavClientService,
    private readonly _issueService: IssueService,
    private readonly _taskService: TaskService,
    private readonly _workContextService: WorkContextService,
    private readonly _issueEffectHelperService: IssueEffectHelperService,
  ) {}

  private _refreshIssues(caldavTasks: TaskWithSubTasks[]) {
    if (caldavTasks && caldavTasks.length > 0) {
      this._snackService.open({
        msg: T.F.CALDAV.S.POLLING,
        svgIco: 'caldav',
        isSpinner: true,
      });
      this._issueService.refreshIssues(caldavTasks, true, false);
    }
  }

  private _importNewIssuesToBacklog(
    projectId: string,
    issuesToAdd: CaldavIssueReduced[],
  ) {
    issuesToAdd.forEach((issue) => {
      this._issueService.addTaskWithIssue(CALDAV_TYPE, issue, projectId, true);
    });

    if (issuesToAdd.length === 1) {
      this._snackService.open({
        ico: 'cloud_download',
        translateParams: {
          issueText: issuesToAdd[0].summary,
        },
        msg: T.F.CALDAV.S.IMPORTED_SINGLE_ISSUE,
      });
    } else if (issuesToAdd.length > 1) {
      this._snackService.open({
        ico: 'cloud_download',
        translateParams: {
          issuesLength: issuesToAdd.length,
        },
        msg: T.F.CALDAV.S.IMPORTED_MULTIPLE_ISSUES,
      });
    }
  }

  private _handleTransitionForIssue$(caldavCfg: CaldavCfg, task: Task): Observable<any> {
    return this._caldavClientService
      .updateCompletedState$(caldavCfg, task.issueId as string, task.isDone)
      .pipe(concatMap(() => this._issueService.refreshIssue(task, true)));
  }

  private _getCfgOnce$(projectId: string): Observable<CaldavCfg> {
    return this._projectService.getCaldavCfgForProject$(projectId).pipe(first());
  }
}
