import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { setCurrentTask, updateTask } from '../../../../../tasks/store/task.actions';
import { concatMap, filter, first, map, take, tap, withLatestFrom } from 'rxjs/operators';
import { select, Store } from '@ngrx/store';
import { OPEN_PROJECT_TYPE } from '../../../../issue.const';
import { ProjectService } from '../../../../../project/project.service';
import { MatDialog } from '@angular/material/dialog';
import { Task } from '../../../../../tasks/task.model';
import { OpenProjectCfg, OpenProjectTransitionOption } from '../../open-project.model';
import { EMPTY, Observable, of, timer } from 'rxjs';
import { DialogOpenProjectTrackTimeComponent } from '../../open-project-view-components/dialog-open-project-track-time/dialog-open-project-track-time.component';
import { OpenProjectApiService } from '../../open-project-api.service';
import { TaskService } from '../../../../../tasks/task.service';
import { selectCurrentTaskParentOrCurrent } from 'src/app/features/tasks/store/task.selectors';
import { isOpenProjectEnabled } from '../../is-open-project-enabled.util';
import { IssueLocalState } from 'src/app/features/issue/issue.model';
import { SnackService } from 'src/app/core/snack/snack.service';
import { OpenProjectWorkPackage } from '../open-project-issue.model';
import { IssueService } from 'src/app/features/issue/issue.service';
import { T } from 'src/app/t.const';
import { DialogOpenprojectTransitionComponent } from '../../open-project-view-components/dialog-openproject-transition/dialog-openproject-transition.component';

@Injectable()
export class OpenProjectEffects {
  postTime$: any = createEffect(
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
          mainTask.issueType === OPEN_PROJECT_TYPE &&
          mainTask.issueId &&
          mainTask.projectId
            ? this._getCfgOnce$(mainTask.projectId).pipe(
                tap((openProjectCfg) => {
                  if (
                    subTask &&
                    openProjectCfg.isShowTimeTrackingDialogForEachSubTask &&
                    openProjectCfg.isShowTimeTrackingDialog
                  ) {
                    this._openTrackTimeDialog(
                      subTask,
                      +(mainTask.issueId as string),
                      openProjectCfg,
                    );
                  } else if (
                    openProjectCfg.isShowTimeTrackingDialog &&
                    !subTask &&
                    (!openProjectCfg.isShowTimeTrackingDialogForEachSubTask ||
                      !mainTask.subTaskIds.length)
                  ) {
                    this._openTrackTimeDialog(
                      mainTask,
                      +(mainTask.issueId as string),
                      openProjectCfg,
                    );
                  }
                }),
              )
            : EMPTY,
        ),
      ),
    { dispatch: false },
  );

  checkForStartTransition$: Observable<any> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(setCurrentTask),
        // only if a task is started
        filter(({ id }) => !!id),
        withLatestFrom(this._store$.pipe(select(selectCurrentTaskParentOrCurrent))),
        filter(
          ([, currentTaskOrParent]) =>
            currentTaskOrParent && currentTaskOrParent.issueType === OPEN_PROJECT_TYPE,
        ),
        concatMap(([, currentTaskOrParent]) => {
          if (!currentTaskOrParent.projectId) {
            throw new Error('No projectId for task');
          }
          return this._getCfgOnce$(currentTaskOrParent.projectId).pipe(
            map((openProjectCfg) => ({ openProjectCfg, currentTaskOrParent })),
          );
        }),
        filter(
          ({ openProjectCfg, currentTaskOrParent }) =>
            isOpenProjectEnabled(openProjectCfg) &&
            openProjectCfg.isTransitionIssuesEnabled,
        ),
        concatMap(({ openProjectCfg, currentTaskOrParent }) =>
          this._handleTransitionForIssue(
            IssueLocalState.IN_PROGRESS,
            openProjectCfg,
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
        filter((task: Task) => task && task.issueType === OPEN_PROJECT_TYPE),
        concatMap((task: Task) => {
          if (!task.projectId) {
            throw new Error('No projectId for task');
          }
          return this._getCfgOnce$(task.projectId).pipe(
            map((openProjectCfg) => ({ openProjectCfg, task })),
          );
        }),
        filter(
          ({ openProjectCfg, task }) =>
            isOpenProjectEnabled(openProjectCfg) &&
            openProjectCfg.isTransitionIssuesEnabled,
        ),
        concatMap(({ openProjectCfg, task }) => {
          return this._handleTransitionForIssue(
            IssueLocalState.DONE,
            openProjectCfg,
            task,
          );
        }),
      ),
    { dispatch: false },
  );

  constructor(
    private readonly _actions$: Actions,
    private readonly _store$: Store<any>,
    private readonly _snackService: SnackService,
    private readonly _projectService: ProjectService,
    private readonly _openProjectApiService: OpenProjectApiService,
    private readonly _matDialog: MatDialog,
    private readonly _taskService: TaskService,
    private readonly _issueService: IssueService,
  ) {}

  private _openTrackTimeDialog(
    task: Task,
    workPackageId: number,
    openProjectCfg: OpenProjectCfg,
  ): void {
    this._openProjectApiService
      .getById$(workPackageId, openProjectCfg)
      .pipe(take(1))
      .subscribe((workPackage) => {
        this._matDialog.open(DialogOpenProjectTrackTimeComponent, {
          restoreFocus: true,
          data: {
            workPackage,
            task,
          },
        });
      });
  }

  private _getCfgOnce$(projectId: string): Observable<OpenProjectCfg> {
    return this._projectService.getOpenProjectCfgForProject$(projectId).pipe(first());
  }

  private _handleTransitionForIssue(
    localState: IssueLocalState,
    openProjectCfg: OpenProjectCfg,
    task: Task,
  ): Observable<any> {
    const chosenTransition: OpenProjectTransitionOption =
      openProjectCfg.transitionConfig[localState];

    if (!task.issueId) {
      throw new Error('No issueId for task');
    }

    switch (chosenTransition) {
      case 'DO_NOT':
        return EMPTY;
      case 'ALWAYS_ASK':
        return this._openProjectApiService
          .getById$(task.issueId as unknown as number, openProjectCfg)
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
              this._openProjectApiService.getById$(
                task.issueId as unknown as number,
                openProjectCfg,
              ),
            ),
            concatMap((issue: OpenProjectWorkPackage) =>
              this._openTransitionDialog(issue, localState, task),
            ),
          );
        }

        return this._openProjectApiService
          .getById$(task.issueId as unknown as number, openProjectCfg)
          .pipe(
            concatMap((issue) => {
              if (
                !issue._embedded.status ||
                issue._embedded.status.name !== chosenTransition.name
              ) {
                return this._openProjectApiService
                  .transitionIssue$(
                    { ...issue, percentageDone: openProjectCfg.progressOnDone },
                    chosenTransition,
                    openProjectCfg,
                  )
                  .pipe(
                    concatMap(() => {
                      this._snackService.open({
                        type: 'SUCCESS',
                        msg: T.F.OPEN_PROJECT.S.TRANSITION_SUCCESS,
                        translateParams: {
                          issueKey: `${issue.subject}`,
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

  private _openTransitionDialog(
    issue: OpenProjectWorkPackage,
    localState: IssueLocalState,
    task: Task,
  ): Observable<any> {
    return this._matDialog
      .open(DialogOpenprojectTransitionComponent, {
        restoreFocus: true,
        data: {
          issue,
          localState,
          task,
        },
      })
      .afterClosed();
  }
}
