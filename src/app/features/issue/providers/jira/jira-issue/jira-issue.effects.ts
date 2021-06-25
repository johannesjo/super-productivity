import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { select, Store } from '@ngrx/store';
import {
  concatMap,
  filter,
  first,
  map,
  mapTo,
  switchMap,
  take,
  takeUntil,
  tap,
  throttleTime,
  withLatestFrom,
} from 'rxjs/operators';
import { JiraApiService } from '../jira-api.service';
import { JiraIssueReduced } from './jira-issue.model';
import { SnackService } from '../../../../../core/snack/snack.service';
import { Task, TaskWithSubTasks } from '../../../../tasks/task.model';
import { TaskService } from '../../../../tasks/task.service';
import {
  BehaviorSubject,
  EMPTY,
  forkJoin,
  Observable,
  of,
  throwError,
  timer,
} from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { DialogJiraTransitionComponent } from '../jira-view-components/dialog-jira-transition/dialog-jira-transition.component';
import { IssueLocalState } from '../../../issue.model';
import { JIRA_INITIAL_POLL_BACKLOG_DELAY, JIRA_POLL_INTERVAL } from '../jira.const';
import { ProjectService } from '../../../../project/project.service';
import { IssueService } from '../../../issue.service';
import { JIRA_TYPE } from '../../../issue.const';
import { T } from '../../../../../t.const';
import { truncate } from '../../../../../util/truncate';
import { WorkContextService } from '../../../../work-context/work-context.service';
import { JiraCfg, JiraTransitionOption } from '../jira.model';
import { IssueEffectHelperService } from '../../../issue-effect-helper.service';
import {
  SetCurrentTask,
  TaskActionTypes,
  UpdateTask,
} from '../../../../tasks/store/task.actions';
import { DialogJiraAddWorklogComponent } from '../jira-view-components/dialog-jira-add-worklog/dialog-jira-add-worklog.component';
import {
  selectCurrentTaskParentOrCurrent,
  selectTaskEntities,
} from '../../../../tasks/store/task.selectors';
import { Dictionary } from '@ngrx/entity';
import { HANDLED_ERROR_PROP_STR } from '../../../../../app.constants';
import { DialogConfirmComponent } from '../../../../../ui/dialog-confirm/dialog-confirm.component';
import { setActiveWorkContext } from '../../../../work-context/store/work-context.actions';
import { WorkContextType } from '../../../../work-context/work-context.model';
import { isJiraEnabled } from '../is-jira-enabled.util';

@Injectable()
export class JiraIssueEffects {
  // -----
  @Effect({ dispatch: false })
  addWorklog$: any = this._actions$.pipe(
    ofType(TaskActionTypes.UpdateTask),
    filter((act: UpdateTask) => act.payload.task.changes.isDone === true),
    withLatestFrom(
      this._workContextService.isActiveWorkContextProject$,
      this._workContextService.activeWorkContextId$,
    ),
    filter(([, isActiveContextProject]) => isActiveContextProject),
    concatMap(([act, , projectId]) =>
      this._getCfgOnce$(projectId as string).pipe(
        map((jiraCfg) => ({
          act,
          projectId,
          jiraCfg,
        })),
      ),
    ),
    filter(({ jiraCfg }) => isJiraEnabled(jiraCfg)),
    withLatestFrom(this._store$.pipe(select(selectTaskEntities))),
    tap(
      ([{ act, projectId, jiraCfg }, taskEntities]: [
        {
          act: UpdateTask;
          projectId: string | null;
          jiraCfg: JiraCfg;
        },
        Dictionary<Task>,
      ]) => {
        const taskId = act.payload.task.id;
        const task = taskEntities[taskId];
        if (!task) {
          throw new Error('No task');
        }

        if (jiraCfg.isAddWorklogOnSubTaskDone && jiraCfg.isWorklogEnabled) {
          if (
            task &&
            task.issueType === JIRA_TYPE &&
            task.issueId &&
            !(jiraCfg.isAddWorklogOnSubTaskDone && task.subTaskIds.length > 0)
          ) {
            this._openWorklogDialog(task, task.issueId, jiraCfg);
          } else if (task.parentId) {
            const parent = taskEntities[task.parentId];
            if (parent && parent.issueId && parent.issueType === JIRA_TYPE) {
              // NOTE we're still sending the sub task for the meta data we need
              this._openWorklogDialog(task, parent.issueId, jiraCfg);
            }
          }
        }
        return undefined;
      },
    ),
  );

  // CHECK CONNECTION
  // ----------------
  // NOTE: we don't handle the case of a tag list with multiple and possibly different jira cfgs
  // we only handle the case when we are in a project. This also makes sense because this might
  // be the most likely scenario for us encountering lots of jira requests, which might get us
  // locked out from the server
  // NOTE2: this should work 99.9% of the time. It might however not always work when we switch
  // from a project with a working jira cfg to one with a non working one, but on the other hand
  // this is already complicated enough as is...
  // I am sorry future me O:)
  @Effect({ dispatch: false })
  checkForReassignment: any = this._actions$.pipe(
    ofType(TaskActionTypes.SetCurrentTask),
    // only if a task is started
    filter((a: SetCurrentTask) => !!a.payload),
    withLatestFrom(this._store$.pipe(select(selectCurrentTaskParentOrCurrent))),
    filter(
      ([, currentTaskOrParent]) =>
        !!currentTaskOrParent &&
        currentTaskOrParent.issueType === JIRA_TYPE &&
        !!currentTaskOrParent.issueId,
    ),
    concatMap(([, currentTaskOrParent]) => {
      if (!currentTaskOrParent.projectId) {
        throw new Error('No projectId for task');
      }
      return this._getCfgOnce$(currentTaskOrParent.projectId).pipe(
        map((jiraCfg) => ({ jiraCfg, currentTaskOrParent })),
      );
    }),
    filter(
      ({ jiraCfg, currentTaskOrParent }) =>
        isJiraEnabled(jiraCfg) && jiraCfg.isCheckToReAssignTicketOnTaskStart,
    ),
    // show every 15s max to give time for updates
    throttleTime(15000),
    // TODO there is probably a better way to to do this
    // TODO refactor to actions
    switchMap(({ jiraCfg, currentTaskOrParent }) => {
      return this._jiraApiService
        .getReducedIssueById$(currentTaskOrParent.issueId as string, jiraCfg)
        .pipe(
          withLatestFrom(this._jiraApiService.getCurrentUser$(jiraCfg)),
          concatMap(([issue, currentUser]) => {
            const assignee = issue.assignee;

            if (!issue) {
              return throwError({
                [HANDLED_ERROR_PROP_STR]: 'Jira: Issue Data not found',
              });
            } else if (
              !issue.assignee ||
              issue.assignee.accountId !== currentUser.accountId
            ) {
              return this._matDialog
                .open(DialogConfirmComponent, {
                  restoreFocus: true,
                  data: {
                    okTxt: T.F.JIRA.DIALOG_CONFIRM_ASSIGNMENT.OK,
                    translateParams: {
                      summary: issue.summary,
                      assignee: assignee ? assignee.displayName : 'nobody',
                    },
                    message: T.F.JIRA.DIALOG_CONFIRM_ASSIGNMENT.MSG,
                  },
                })
                .afterClosed()
                .pipe(
                  switchMap((isConfirm) => {
                    return isConfirm
                      ? this._jiraApiService.updateAssignee$(
                          issue.id,
                          currentUser.accountId,
                          jiraCfg,
                        )
                      : EMPTY;
                  }),
                  // tap(() => {
                  // TODO fix
                  // this._jiraIssueService.updateIssueFromApi(issue.id, issue, false, false);
                  // }),
                );
            } else {
              return EMPTY;
            }
          }),
        );
    }),
  );

  // POLLING & UPDATES
  @Effect({ dispatch: false })
  checkForStartTransition$: Observable<any> = this._actions$.pipe(
    ofType(TaskActionTypes.SetCurrentTask),
    // only if a task is started
    filter((a: SetCurrentTask) => !!a.payload),
    withLatestFrom(this._store$.pipe(select(selectCurrentTaskParentOrCurrent))),
    filter(
      ([, currentTaskOrParent]) =>
        currentTaskOrParent && currentTaskOrParent.issueType === JIRA_TYPE,
    ),
    concatMap(([, currentTaskOrParent]) => {
      if (!currentTaskOrParent.projectId) {
        throw new Error('No projectId for task');
      }
      return this._getCfgOnce$(currentTaskOrParent.projectId).pipe(
        map((jiraCfg) => ({ jiraCfg, currentTaskOrParent })),
      );
    }),
    filter(
      ({ jiraCfg, currentTaskOrParent }) =>
        isJiraEnabled(jiraCfg) && jiraCfg.isTransitionIssuesEnabled,
    ),
    concatMap(({ jiraCfg, currentTaskOrParent }) =>
      this._handleTransitionForIssue(
        IssueLocalState.IN_PROGRESS,
        jiraCfg,
        currentTaskOrParent,
      ),
    ),
  );
  @Effect({ dispatch: false })
  checkForDoneTransition$: Observable<any> = this._actions$.pipe(
    ofType(TaskActionTypes.UpdateTask),
    filter((a: UpdateTask): boolean => !!a.payload.task.changes.isDone),
    concatMap((a: UpdateTask) =>
      this._taskService.getByIdOnce$(a.payload.task.id as string),
    ),
    filter((task: Task) => task && task.issueType === JIRA_TYPE),
    concatMap((task: Task) => {
      if (!task.projectId) {
        throw new Error('No projectId for task');
      }
      return this._getCfgOnce$(task.projectId).pipe(
        map((jiraCfg) => ({ jiraCfg, task })),
      );
    }),
    filter(
      ({ jiraCfg, task }) => isJiraEnabled(jiraCfg) && jiraCfg.isTransitionIssuesEnabled,
    ),
    concatMap(({ jiraCfg, task }) => {
      return this._handleTransitionForIssue(IssueLocalState.DONE, jiraCfg, task);
    }),
  );

  // HOOKS
  private _isInitialRequestForProjectDone$: BehaviorSubject<boolean> =
    new BehaviorSubject<boolean>(false);

  @Effect({ dispatch: false })
  checkConnection$: Observable<any> = this._actions$.pipe(
    ofType(setActiveWorkContext),
    tap(() => this._isInitialRequestForProjectDone$.next(false)),
    filter(({ activeType }) => activeType === WorkContextType.PROJECT),
    concatMap(({ activeId }) => this._getCfgOnce$(activeId)),
    // NOTE: might not be loaded yet
    filter((jiraCfg) => isJiraEnabled(jiraCfg)),
    // just fire any single request
    concatMap((jiraCfg) => this._jiraApiService.getCurrentUser$(jiraCfg)),
    tap(() => this._isInitialRequestForProjectDone$.next(true)),
  );
  private _pollTimer$: Observable<number> = timer(
    JIRA_INITIAL_POLL_BACKLOG_DELAY,
    JIRA_POLL_INTERVAL,
  );
  // -----------------
  @Effect({ dispatch: false })
  pollNewIssuesToBacklog$: any = this._issueEffectHelperService.pollToBacklogTriggerToProjectId$.pipe(
    switchMap(this._afterInitialRequestCheckForProjectJiraSuccessfull$.bind(this)),
    switchMap((pId: string) =>
      this._getCfgOnce$(pId).pipe(
        filter((jiraCfg) => isJiraEnabled(jiraCfg) && jiraCfg.isAutoAddToBacklog),
        // tap(() => console.log('POLL TIMER STARTED')),
        switchMap((jiraCfg) =>
          this._pollTimer$.pipe(
            // NOTE: required otherwise timer stays alive for filtered actions
            takeUntil(this._issueEffectHelperService.pollToBacklogActions$),
            tap(() => console.log('JIRA_POLL_BACKLOG_CHANGES')),
            tap(() => this._importNewIssuesToBacklog(pId, jiraCfg)),
          ),
        ),
      ),
    ),
  );
  @Effect({ dispatch: false })
  pollIssueChangesForCurrentContext$: any = this._issueEffectHelperService.pollIssueTaskUpdatesActions$.pipe(
    switchMap((inVal) =>
      this._workContextService.isActiveWorkContextProject$.pipe(
        take(1),
        switchMap((isProject) =>
          isProject
            ? this._afterInitialRequestCheckForProjectJiraSuccessfull$(inVal)
            : of(inVal),
        ),
      ),
    ),
    switchMap(() => this._pollTimer$),
    switchMap(() =>
      this._workContextService.allTasksForCurrentContext$.pipe(
        first(),
        switchMap((tasks) => {
          const jiraIssueTasks = tasks.filter((task) => task.issueType === JIRA_TYPE);
          return forkJoin(
            jiraIssueTasks.map((task) => {
              if (!task.projectId) {
                throw new Error('No projectId for task');
              }
              return this._getCfgOnce$(task.projectId).pipe(
                map((cfg) => ({ cfg, task })),
              );
            }),
          );
        }),
        map((cos) =>
          cos
            .filter(
              ({ cfg, task }: { cfg: JiraCfg; task: TaskWithSubTasks }) =>
                isJiraEnabled(cfg) && cfg.isAutoPollTickets,
            )
            .map(({ task }: { cfg: JiraCfg; task: TaskWithSubTasks }) => task),
        ),
        tap((jiraTasks: TaskWithSubTasks[]) => {
          if (jiraTasks && jiraTasks.length > 0) {
            this._snackService.open({
              msg: T.F.JIRA.S.POLLING,
              svgIco: 'jira',
              isSpinner: true,
            });
            jiraTasks.forEach((task) =>
              this._issueService.refreshIssue(task, true, false),
            );
          }
        }),
      ),
    ),
  );

  constructor(
    private readonly _actions$: Actions,
    private readonly _store$: Store<any>,
    private readonly _snackService: SnackService,
    private readonly _projectService: ProjectService,
    private readonly _taskService: TaskService,
    private readonly _workContextService: WorkContextService,
    private readonly _jiraApiService: JiraApiService,
    private readonly _issueService: IssueService,
    private readonly _matDialog: MatDialog,
    private readonly _issueEffectHelperService: IssueEffectHelperService,
  ) {}

  private _afterInitialRequestCheckForProjectJiraSuccessfull$<TY>(
    args: TY,
  ): Observable<TY> {
    return this._isInitialRequestForProjectDone$.pipe(
      filter((isDone) => isDone),
      take(1),
      mapTo(args),
    );
  }

  private _handleTransitionForIssue(
    localState: IssueLocalState,
    jiraCfg: JiraCfg,
    task: Task,
  ): Observable<any> {
    const chosenTransition: JiraTransitionOption = jiraCfg.transitionConfig[localState];

    if (!task.issueId) {
      throw new Error('No issueId for task');
    }

    switch (chosenTransition) {
      case 'DO_NOT':
        return EMPTY;
      case 'ALWAYS_ASK':
        return this._jiraApiService
          .getReducedIssueById$(task.issueId, jiraCfg)
          .pipe(
            concatMap((issue) => this._openTransitionDialog(issue, localState, task)),
          );
      default:
        if (!chosenTransition || !chosenTransition.id) {
          this._snackService.open({
            msg: T.F.JIRA.S.NO_VALID_TRANSITION,
            type: 'ERROR',
          });
          // NOTE: we would kill the whole effect chain if we do this
          // return throwError({[HANDLED_ERROR_PROP_STR]: 'Jira: No valid transition configured'});
          return timer(2000).pipe(
            concatMap(() =>
              this._jiraApiService.getReducedIssueById$(task.issueId as string, jiraCfg),
            ),
            concatMap((issue: JiraIssueReduced) =>
              this._openTransitionDialog(issue, localState, task),
            ),
          );
        }

        return this._jiraApiService.getReducedIssueById$(task.issueId, jiraCfg).pipe(
          concatMap((issue) => {
            if (!issue.status || issue.status.name !== chosenTransition.name) {
              return this._jiraApiService
                .transitionIssue$(issue.id, chosenTransition.id, jiraCfg)
                .pipe(
                  concatMap(() => {
                    this._snackService.open({
                      type: 'SUCCESS',
                      msg: T.F.JIRA.S.TRANSITION_SUCCESS,
                      translateParams: {
                        issueKey: `${issue.key}`,
                        chosenTransition: `${chosenTransition.name}`,
                      },
                    });
                    return this._issueService.refreshIssue(task, false, false);
                  }),
                );
            } else {
              // no transition required
              return EMPTY;
            }
          }),
        );
    }
  }

  private _openWorklogDialog(task: Task, issueId: string, jiraCfg: JiraCfg) {
    return this._jiraApiService
      .getReducedIssueById$(issueId, jiraCfg)
      .pipe(take(1))
      .subscribe((issue) => {
        this._matDialog.open(DialogJiraAddWorklogComponent, {
          restoreFocus: true,
          data: {
            issue,
            task,
          },
        });
      });
  }

  private _openTransitionDialog(
    issue: JiraIssueReduced,
    localState: IssueLocalState,
    task: Task,
  ): Observable<any> {
    return this._matDialog
      .open(DialogJiraTransitionComponent, {
        restoreFocus: true,
        data: {
          issue,
          localState,
          task,
        },
      })
      .afterClosed();
  }

  private _importNewIssuesToBacklog(projectId: string, cfg: JiraCfg) {
    this._jiraApiService
      .findAutoImportIssues$(cfg)
      .subscribe(async (issues: JiraIssueReduced[]) => {
        if (!Array.isArray(issues)) {
          return;
        }
        const allTaskJiraIssueIds = (await this._taskService.getAllIssueIdsForProject(
          projectId,
          JIRA_TYPE,
        )) as string[];

        // NOTE: we check for key as well as id although normally the key should suffice
        const issuesToAdd = issues.filter(
          (issue) =>
            !allTaskJiraIssueIds.includes(issue.id) &&
            !allTaskJiraIssueIds.includes(issue.key),
        );

        issuesToAdd.forEach((issue) => {
          this._issueService.addTaskWithIssue(JIRA_TYPE, issue, projectId, true);
        });

        if (issuesToAdd.length === 1) {
          this._snackService.open({
            translateParams: {
              issueText: truncate(`${issuesToAdd[0].key} ${issuesToAdd[0].summary}`),
            },
            msg: T.F.JIRA.S.IMPORTED_SINGLE_ISSUE,
            ico: 'cloud_download',
          });
        } else if (issuesToAdd.length > 1) {
          this._snackService.open({
            translateParams: {
              issuesLength: issuesToAdd.length,
            },
            msg: T.F.JIRA.S.IMPORTED_MULTIPLE_ISSUES,
            ico: 'cloud_download',
          });
        }
      });
  }

  private _getCfgOnce$(projectId: string): Observable<JiraCfg> {
    return this._projectService.getJiraCfgForProject$(projectId).pipe(first());
  }
}
