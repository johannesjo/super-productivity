import {Injectable} from '@angular/core';
import {Actions, Effect, ofType} from '@ngrx/effects';
import {AddOpenJiraIssuesToBacklog, JiraIssueActionTypes, UpdateJiraIssue} from './jira-issue.actions';
import {select, Store} from '@ngrx/store';
import {concatMap, filter, map, switchMap, take, tap, throttleTime, withLatestFrom} from 'rxjs/operators';
import {TaskActionTypes, UpdateTask} from '../../../../tasks/store/task.actions';
import {PersistenceService} from '../../../../../core/persistence/persistence.service';
import {selectJiraIssueEntities, selectJiraIssueFeatureState, selectJiraIssueIds} from './jira-issue.reducer';
import {JiraApiService} from '../../jira-api.service';
import {JiraIssueService} from '../jira-issue.service';
import {GlobalConfigService} from '../../../../config/global-config.service';
import {Dictionary} from '@ngrx/entity';
import {JiraIssue} from '../jira-issue.model';
import {JiraCfg, JiraTransitionOption} from '../../jira';
import {SnackService} from '../../../../../core/snack/snack.service';
import {ProjectActionTypes} from '../../../../project/store/project.actions';
import {Task, TaskState} from '../../../../tasks/task.model';
import {JIRA_TYPE} from '../../../issue.const';
import {
  selectAllTasks,
  selectCurrentTaskParentOrCurrent,
  selectTaskEntities,
  selectTaskFeatureState
} from '../../../../tasks/store/task.selectors';
import {TaskService} from '../../../../tasks/task.service';
import {EMPTY, Observable, of, throwError, timer} from 'rxjs';
import {MatDialog} from '@angular/material/dialog';
import {DialogJiraTransitionComponent} from '../../dialog-jira-transition/dialog-jira-transition.component';
import {IssueLocalState} from '../../../issue';
import {DialogConfirmComponent} from '../../../../../ui/dialog-confirm/dialog-confirm.component';
import {DialogJiraAddWorklogComponent} from '../../dialog-jira-add-worklog/dialog-jira-add-worklog.component';
import {JIRA_INITIAL_POLL_BACKLOG_DELAY, JIRA_INITIAL_POLL_DELAY, JIRA_POLL_INTERVAL} from '../../jira.const';
import {isEmail} from '../../../../../util/is-email';
import {T} from '../../../../../t.const';
import {truncate} from '../../../../../util/truncate';
import {ProjectService} from '../../../../project/project.service';
import {HANDLED_ERROR_PROP_STR} from '../../../../../app.constants';

@Injectable()
export class JiraIssueEffects {

  @Effect({dispatch: false}) pollIssueChangesAndBacklogUpdates: any = this._actions$
    .pipe(
      ofType(
        // while load state should be enough this just might fix the error of polling for inactive projects?
        ProjectActionTypes.LoadProjectRelatedDataSuccess,
        ProjectActionTypes.UpdateProjectIssueProviderCfg,
        JiraIssueActionTypes.LoadState,
      ),
      withLatestFrom(
        this._projectService.isJiraEnabled$,
        this._projectService.currentJiraCfg$,
      ),
      switchMap(([a, isEnabled, jiraCfg]) => {
        return (isEnabled && jiraCfg.isAutoPollTickets)
          ? this._pollChangesForIssues$
          : EMPTY;
      })
    );

  @Effect() pollNewIssuesToBacklog$: any = this._actions$
    .pipe(
      ofType(
        ProjectActionTypes.LoadProjectRelatedDataSuccess,
        ProjectActionTypes.UpdateProjectIssueProviderCfg,
        JiraIssueActionTypes.LoadState,
      ),
      withLatestFrom(
        this._projectService.isJiraEnabled$,
        this._projectService.currentJiraCfg$,
      ),
      switchMap(([a, isEnabled, jiraCfg]) => {
        return (isEnabled && jiraCfg.isAutoAddToBacklog)
          ? timer(JIRA_INITIAL_POLL_BACKLOG_DELAY, JIRA_POLL_INTERVAL).pipe(
            // tap(() => console.log('JIRA_POLL_BACKLOG_CHANGES')),
            map(() => new AddOpenJiraIssuesToBacklog())
          )
          : EMPTY;
      }),
    );

  @Effect({dispatch: false}) syncIssueStateToLs$: any = this._actions$
    .pipe(
      ofType(
        TaskActionTypes.AddTask,
        TaskActionTypes.DeleteTask,
        TaskActionTypes.RestoreTask,
        TaskActionTypes.MoveToArchive,
        JiraIssueActionTypes.AddJiraIssue,
        JiraIssueActionTypes.DeleteJiraIssue,
        JiraIssueActionTypes.UpdateJiraIssue,
        JiraIssueActionTypes.AddJiraIssues,
        JiraIssueActionTypes.DeleteJiraIssues,
        JiraIssueActionTypes.UpsertJiraIssue,
      ),
      withLatestFrom(
        this._projectService.currentId$,
        this._store$.pipe(select(selectJiraIssueFeatureState)),
      ),
      tap(this._saveToLs.bind(this))
    );

  @Effect({dispatch: false}) addOpenIssuesToBacklog$: any = this._actions$
    .pipe(
      ofType(
        JiraIssueActionTypes.AddOpenJiraIssuesToBacklog,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectAllTasks)),
      ),
      tap(this._importNewIssuesToBacklog.bind(this))
    );


  @Effect({dispatch: false}) addWorklog$: any = this._actions$
    .pipe(
      ofType(
        TaskActionTypes.UpdateTask,
      ),
      withLatestFrom(
        this._projectService.isJiraEnabled$,
        this._projectService.currentJiraCfg$,
        this._store$.pipe(select(selectJiraIssueEntities)),
        this._store$.pipe(select(selectTaskEntities)),
      ),
      filter(([actIN, isEnabled]) => isEnabled),
      tap(([actIN, isEnabled, jiraCfg, jiraEntities, taskEntities]) => {
        const act = actIN as UpdateTask;
        const taskId = act.payload.task.id;
        const isDone = act.payload.task.changes.isDone;
        const task = taskEntities[taskId];

        if (!isDone || !jiraCfg) {
          return;
        }

        if (jiraCfg.isWorklogEnabled
          && task && task.issueType === JIRA_TYPE
          && !(jiraCfg.isAddWorklogOnSubTaskDone && task.subTaskIds.length > 0)) {
          this._openWorklogDialog(task, jiraEntities[task.issueId]);

        } else {
          const parent = task.parentId && taskEntities[task.parentId];
          if (parent && jiraCfg.isAddWorklogOnSubTaskDone && parent.issueType === JIRA_TYPE) {
            // NOTE we're still sending the sub task for the meta data we need
            this._openWorklogDialog(task, jiraEntities[parent.issueId]);
          }
        }
      })
    );

  @Effect({dispatch: false}) checkForReassignment: any = this._actions$
    .pipe(
      ofType(
        TaskActionTypes.SetCurrentTask,
        JiraIssueActionTypes.UpdateJiraIssue,
      ),
      withLatestFrom(
        this._projectService.isJiraEnabled$,
        this._projectService.currentJiraCfg$,
        this._store$.pipe(select(selectCurrentTaskParentOrCurrent)),
        this._store$.pipe(select(selectJiraIssueEntities)),
      ),
      filter(([action, isEnabled, jiraCfg, currentTaskOrParent]) =>
        isEnabled
        && jiraCfg.isCheckToReAssignTicketOnTaskStart
        && currentTaskOrParent && currentTaskOrParent.issueType === JIRA_TYPE),
      // show every 15s max to give time for updates
      throttleTime(15000),
      // TODO there is probably a better way to to do this
      // TODO refactor to actions
      switchMap(([action, isEnabled, jiraCfg, currentTaskOrParent, issueEntities]) => {
        const issue = issueEntities[currentTaskOrParent.issueId];
        const assignee = issue.assignee;
        const currentUserName = jiraCfg.userAssigneeName || jiraCfg.userName;

        if (isEmail(currentUserName)) {
          this._snackService.open({
            svgIco: 'jira',
            msg: T.F.JIRA.S.UNABLE_TO_REASSIGN,
          });
          return EMPTY;
        } else if (!issue) {
          return throwError({[HANDLED_ERROR_PROP_STR]: 'Jira: Issue Data not found'});
        } else if (!issue.assignee || issue.assignee.name !== currentUserName) {
          return this._matDialog.open(DialogConfirmComponent, {
            restoreFocus: true,
            data: {
              okTxt: T.F.JIRA.DIALOG_CONFIRM_ASSIGNMENT.OK,
              translateParams: {
                summary: issue.summary,
                assignee: assignee ? assignee.displayName : 'nobody'
              },
              message: T.F.JIRA.DIALOG_CONFIRM_ASSIGNMENT.MSG,
            }
          }).afterClosed()
            .pipe(
              switchMap((isConfirm) => {
                return isConfirm
                  ? this._jiraApiService.updateAssignee$(issue.id, currentUserName)
                  : EMPTY;
              }),
              tap(() => {
                this._jiraIssueService.updateIssueFromApi(issue.id, issue, false, false);
              }),
            );
        } else {
          return EMPTY;
        }
      })
    );

  @Effect({dispatch: false}) checkForStartTransition$: Observable<any> = this._actions$
    .pipe(
      ofType(
        TaskActionTypes.SetCurrentTask,
      ),
      withLatestFrom(
        this._projectService.isJiraEnabled$,
        this._projectService.currentJiraCfg$,
        this._store$.pipe(select(selectCurrentTaskParentOrCurrent)),
        this._store$.pipe(select(selectJiraIssueEntities)),
      ),
      filter(([action, isEnabled]) => isEnabled),
      filter(([action, isEnabled, jiraCfg, curOrParTask, issueEntities]) =>
        jiraCfg && jiraCfg.isTransitionIssuesEnabled && curOrParTask && curOrParTask.issueType === JIRA_TYPE),
      concatMap(([action, isEnabled, jiraCfg, curOrParTask, issueEntities]) => {
        const issueData = issueEntities[curOrParTask.issueId];
        return this._handleTransitionForIssue('IN_PROGRESS', jiraCfg, issueData);
      }),
    );

  @Effect({dispatch: false})
  checkForDoneTransition$: Observable<any> = this._actions$
    .pipe(
      ofType(
        TaskActionTypes.UpdateTask,
      ),
      withLatestFrom(
        this._projectService.isJiraEnabled$,
        this._projectService.currentJiraCfg$,
        this._store$.pipe(select(selectTaskFeatureState)),
        this._store$.pipe(select(selectJiraIssueEntities)),
      ),
      filter(([a, isEnabled]) => isEnabled),
      filter(([a, isEnabled, jiraCfg, taskState, issueEntities]: [UpdateTask, boolean, JiraCfg, TaskState, Dictionary<JiraIssue>]) => {
        const task = taskState.entities[a.payload.task.id];
        return jiraCfg && jiraCfg.isTransitionIssuesEnabled && task && task.issueType === JIRA_TYPE && task.isDone;
      }),
      concatMap(([a, isEnabled, jiraCfg, taskState, issueEntities]: [UpdateTask, boolean, JiraCfg, TaskState, Dictionary<JiraIssue>]) => {
        const task = taskState.entities[a.payload.task.id];
        const issueData = issueEntities[task.issueId];
        return this._handleTransitionForIssue('DONE', jiraCfg, issueData);
      })
    );

  @Effect({dispatch: false}) loadMissingIssues$: any = this._taskService.tasksWithMissingIssueData$
    .pipe(
      withLatestFrom(
        this._projectService.isJiraEnabled$,
      ),
      filter(([tasks, isEnabled]) => isEnabled),
      throttleTime(60 * 1000),
      map(([tasks]) => tasks.filter(task => task.issueId && task.issueType === JIRA_TYPE)),
      filter((tasks) => tasks && tasks.length > 0),
      tap(tasks => {
        console.warn('TASKS WITH MISSING ISSUE DATA FOR JIRA', tasks);
        this._snackService.open({
          msg: T.F.JIRA.S.MISSING_ISSUE_DATA,
          svgIco: 'jira',
        });
        tasks.forEach((task) => this._jiraIssueService.loadMissingIssueData(task.issueId));
      })
    );

  @Effect() updateTaskTitleIfChanged$: any = this._actions$
    .pipe(
      ofType(
        JiraIssueActionTypes.UpdateJiraIssue,
      ),
      filter((a: UpdateJiraIssue) => {
        const {jiraIssue, oldIssue} = a.payload;
        return (jiraIssue.changes.summary && oldIssue && oldIssue.summary
          && jiraIssue.changes.summary !== oldIssue.summary);
      }),
      concatMap((a: UpdateJiraIssue) => of(a).pipe(
        withLatestFrom(
          this._taskService.getByIssueId$(a.payload.jiraIssue.id, JIRA_TYPE).pipe(take(1))
        ),
      )),
      map(([a, task]: [UpdateJiraIssue, Task]) => new UpdateTask({
          task: {
            id: task.id,
            changes: {
              title: a.payload.jiraIssue.changes.summary,
            }
          }
        })
      ),
    );

  private _pollChangesForIssues$: Observable<any> = timer(JIRA_INITIAL_POLL_DELAY, JIRA_POLL_INTERVAL).pipe(
    withLatestFrom(
      this._store$.pipe(select(selectJiraIssueIds)),
      this._store$.pipe(select(selectJiraIssueEntities)),
    ),
    tap(([x, issueIdsIN, entities]: [number, string[], Dictionary<JiraIssue>]) => {
      const issueIds = issueIdsIN as string[];
      if (issueIds && issueIds.length > 0) {
        this._snackService.open({
          msg: T.F.JIRA.S.POLLING,
          svgIco: 'jira',
          isSpinner: true,
        });
        issueIds.forEach((id) => this._jiraIssueService.updateIssueFromApi(id, entities[id], true, false));
      }
    }),
  );

  constructor(private readonly _actions$: Actions,
              private readonly _store$: Store<any>,
              private readonly _configService: GlobalConfigService,
              private readonly _snackService: SnackService,
              private readonly _projectService: ProjectService,
              private readonly _taskService: TaskService,
              private readonly _jiraApiService: JiraApiService,
              private readonly _jiraIssueService: JiraIssueService,
              private readonly _persistenceService: PersistenceService,
              private readonly _matDialog: MatDialog,
  ) {
  }

  private _saveToLs([action, currentProjectId, jiraIssueFeatureState]) {
    if (currentProjectId) {
      this._persistenceService.saveLastActive();
      this._persistenceService.saveIssuesForProject(currentProjectId, JIRA_TYPE, jiraIssueFeatureState);
    } else {
      throw new Error('No current project id');
    }
  }

  private _handleTransitionForIssue(localState: IssueLocalState, jiraCfg: JiraCfg, issue: JiraIssue): Observable<any> {
    const chosenTransition: JiraTransitionOption = jiraCfg.transitionConfig[localState];

    switch (chosenTransition) {
      case 'DO_NOT':
        return EMPTY;
      case 'ALWAYS_ASK':
        return this._openTransitionDialog(issue, localState);
      default:
        if (!chosenTransition || !chosenTransition.id) {
          this._snackService.open({
            msg: T.F.JIRA.S.NO_VALID_TRANSITION,
            type: 'ERROR',
          });
          // NOTE: we would kill the whole effect chain if we do this
          // return throwError({[HANDLED_ERROR_PROP_STR]: 'Jira: No valid transition configured'});
          return timer(2000).pipe(concatMap(() => this._openTransitionDialog(issue, localState)));
        }

        if (!issue.status || issue.status.name !== chosenTransition.name) {
          return this._jiraApiService.transitionIssue$(issue.id, chosenTransition.id)
            .pipe(
              tap(() => {
                this._snackService.open({
                  type: 'SUCCESS',
                  msg: T.F.JIRA.S.TRANSITION_SUCCESS,
                  translateParams: {
                    issueKey: `${issue.key}`,
                    chosenTransition: `${chosenTransition.name}`,
                  },
                });
                this._jiraIssueService.updateIssueFromApi(issue.id, issue, false, false);
              })
            );
        } else {
          // no transition required
          return EMPTY;
        }
    }
  }

  private _openWorklogDialog(task: Task, issue: JiraIssue) {
    this._matDialog.open(DialogJiraAddWorklogComponent, {
      restoreFocus: true,
      data: {
        issue,
        task,
      }
    }).afterClosed()
      .subscribe();
  }

  private _openTransitionDialog(issue: JiraIssue, localState: IssueLocalState): Observable<any> {
    return this._matDialog.open(DialogJiraTransitionComponent, {
      restoreFocus: true,
      data: {
        issue,
        localState,
      }
    }).afterClosed();
  }

  private _importNewIssuesToBacklog([action, allTasks]: [Actions, Task[]]) {
    this._jiraApiService.findAutoImportIssues$().subscribe(async (issues: JiraIssue[]) => {
      if (!Array.isArray(issues)) {
        return;
      }
      const allTaskJiraIssueIds = await this._taskService.getAllIssueIdsForCurrentProject(JIRA_TYPE) as string[];

      const issuesToAdd = issues.filter(issue => !allTaskJiraIssueIds.includes(issue.id));
      issuesToAdd.forEach((issue) => {
        this._taskService.addWithIssue(
          `${issue.key} ${issue.summary}`,
          JIRA_TYPE,
          issue,
          true,
        );
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
            issuesLength: issuesToAdd.length
          },
          msg: T.F.JIRA.S.IMPORTED_MULTIPLE_ISSUES,
          ico: 'cloud_download',
        });
      }
    });
  }
}

