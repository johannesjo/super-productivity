import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { select, Store } from '@ngrx/store';
import {
  concatMap,
  filter,
  first,
  map,
  switchMap,
  take,
  tap,
  throttleTime,
  withLatestFrom,
} from 'rxjs/operators';
import { JiraApiService } from '../jira-api.service';
import { JiraIssueReduced } from './jira-issue.model';
import { SnackService } from '../../../../../core/snack/snack.service';
import { Task } from '../../../../tasks/task.model';
import { TaskService } from '../../../../tasks/task.service';
import { BehaviorSubject, EMPTY, Observable, of, throwError, timer } from 'rxjs';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { DialogJiraTransitionComponent } from '../jira-view-components/dialog-jira-transition/dialog-jira-transition.component';
import { IssueLocalState } from '../../../issue.model';
import { ProjectService } from '../../../../project/project.service';
import { IssueService } from '../../../issue.service';
import { JIRA_TYPE } from '../../../issue.const';
import { T } from '../../../../../t.const';
import { WorkContextService } from '../../../../work-context/work-context.service';
import { JiraCfg, JiraTransitionOption } from '../jira.model';
import { setCurrentTask, updateTask } from '../../../../tasks/store/task.actions';
import { DialogJiraAddWorklogComponent } from '../jira-view-components/dialog-jira-add-worklog/dialog-jira-add-worklog.component';
import { selectCurrentTaskParentOrCurrent } from '../../../../tasks/store/task.selectors';
import { HANDLED_ERROR_PROP_STR } from '../../../../../app.constants';
import { DialogConfirmComponent } from '../../../../../ui/dialog-confirm/dialog-confirm.component';
import { setActiveWorkContext } from '../../../../work-context/store/work-context.actions';
import { WorkContextType } from '../../../../work-context/work-context.model';
import { isJiraEnabled } from '../is-jira-enabled.util';

@Injectable()
export class JiraIssueEffects {
  // -----

  addWorkLog$: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(updateTask),
        filter(({ task }) => task.changes.isDone === true),
        concatMap(({ task }) => this._taskService.getByIdOnce$(task.id as string)),
        concatMap((task) =>
          task.parentId
            ? this._taskService
                .getByIdOnce$(task.parentId)
                .pipe(map((parent) => ({ mainTask: parent, subTask: task })))
            : of({ mainTask: task, subTask: undefined }),
        ),
        concatMap(({ mainTask, subTask }) =>
          mainTask.issueType === JIRA_TYPE && mainTask.issueId && mainTask.projectId
            ? this._getCfgOnce$(mainTask.projectId).pipe(
                tap((jiraProjectCfg) => {
                  if (
                    subTask &&
                    jiraProjectCfg.isWorklogEnabled &&
                    jiraProjectCfg.isAddWorklogOnSubTaskDone
                  ) {
                    this._openWorklogDialog(
                      subTask,
                      mainTask.issueId as string,
                      jiraProjectCfg,
                    );
                  } else if (
                    jiraProjectCfg.isAddWorklogOnSubTaskDone &&
                    !subTask &&
                    (!jiraProjectCfg.isWorklogEnabled || !mainTask.subTaskIds.length)
                  ) {
                    this._openWorklogDialog(
                      mainTask,
                      mainTask.issueId as string,
                      jiraProjectCfg,
                    );
                  }
                }),
              )
            : EMPTY,
        ),
      ),
    { dispatch: false },
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

  checkForReassignment: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(setCurrentTask),
        // only if a task is started
        filter(({ id }) => !!id),
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
      ),
    { dispatch: false },
  );

  // POLLING & UPDATES

  checkForStartTransition$: Observable<any> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(setCurrentTask),
        // only if a task is started
        filter(({ id }) => !!id),
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
      ),
    { dispatch: false },
  );

  checkForDoneTransition$: Observable<any> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(updateTask),
        filter(({ task }): boolean => !!task.changes.isDone),
        // NOTE: as this is only a partial object we need to get the full one
        concatMap(({ task }) => this._taskService.getByIdOnce$(task.id as string)),
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
          ({ jiraCfg, task }) =>
            isJiraEnabled(jiraCfg) && jiraCfg.isTransitionIssuesEnabled,
        ),
        concatMap(({ jiraCfg, task }) => {
          return this._handleTransitionForIssue(IssueLocalState.DONE, jiraCfg, task);
        }),
      ),
    { dispatch: false },
  );

  // HOOKS
  private _isInitialRequestForProjectDone$: BehaviorSubject<boolean> =
    new BehaviorSubject<boolean>(false);

  checkConnection$: Observable<any> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(setActiveWorkContext),
        tap(() => this._isInitialRequestForProjectDone$.next(false)),
        filter(({ activeType }) => activeType === WorkContextType.PROJECT),
        concatMap(({ activeId }) => this._getCfgOnce$(activeId)),
        // NOTE: might not be loaded yet
        filter((jiraCfg) => isJiraEnabled(jiraCfg)),
        // just fire any single request
        concatMap((jiraCfg) => this._jiraApiService.getCurrentUser$(jiraCfg)),
        tap(() => this._isInitialRequestForProjectDone$.next(true)),
      ),
    { dispatch: false },
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
  ) {}

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
                    return this._issueService.refreshIssueTask(task, false, false);
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

  private _openWorklogDialog(task: Task, issueId: string, jiraCfg: JiraCfg): void {
    this._jiraApiService
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

  private _getCfgOnce$(projectId: string): Observable<JiraCfg> {
    return this._projectService.getJiraCfgForProject$(projectId).pipe(first());
  }
}
