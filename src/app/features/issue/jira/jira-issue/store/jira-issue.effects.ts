import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { AddOpenJiraIssuesToBacklog, JiraIssueActionTypes } from './jira-issue.actions';
import { select, Store } from '@ngrx/store';
import { filter, map, switchMap, take, tap, throttleTime, withLatestFrom } from 'rxjs/operators';
import { TaskActionTypes, UpdateTask } from '../../../../tasks/store/task.actions';
import { PersistenceService } from '../../../../../core/persistence/persistence.service';
import { selectJiraIssueEntities, selectJiraIssueFeatureState, selectJiraIssueIds } from './jira-issue.reducer';
import { selectCurrentProjectId, selectProjectJiraCfg } from '../../../../project/store/project.reducer';
import { JiraApiService } from '../../jira-api.service';
import { JiraIssueService } from '../jira-issue.service';
import { JIRA_INITIAL_POLL_BACKLOG_DELAY, JIRA_INITIAL_POLL_DELAY, JIRA_POLL_INTERVAL } from '../../jira.const';
import { ConfigService } from '../../../../config/config.service';
import { Dictionary } from '@ngrx/entity';
import { JiraIssue } from '../jira-issue.model';
import { JiraCfg, JiraTransitionOption } from '../../jira';
import { SnackService } from '../../../../../core/snack/snack.service';
import { ProjectActionTypes } from '../../../../project/store/project.actions';
import { Task } from '../../../../tasks/task.model';
import { JIRA_TYPE } from '../../../issue.const';
import {
  selectAllTasks,
  selectCurrentTaskParentOrCurrent,
  selectTaskEntities,
  selectTaskFeatureState
} from '../../../../tasks/store/task.selectors';
import { TaskService } from '../../../../tasks/task.service';
import { EMPTY, timer } from 'rxjs';
import { TaskState } from '../../../../tasks/store/task.reducer';
import { MatDialog } from '@angular/material';
import { DialogJiraTransitionComponent } from '../../dialog-jira-transition/dialog-jira-transition.component';
import { IssueLocalState } from '../../../issue';
import { DialogConfirmComponent } from '../../../../../ui/dialog-confirm/dialog-confirm.component';
import { DialogJiraAddWorklogComponent } from '../../dialog-jira-add-worklog/dialog-jira-add-worklog.component';

const isEnabled = ([a, jiraCfg]: [any, JiraCfg, any?, any?, any?, any?]) => jiraCfg && jiraCfg.isEnabled;

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
        this._store$.pipe(select(selectProjectJiraCfg)),
      ),
      filter(isEnabled),
      filter(([a, jiraCfg]) => jiraCfg.isAutoPollTickets),
      switchMap(() => timer(JIRA_INITIAL_POLL_DELAY, JIRA_POLL_INTERVAL)),
      withLatestFrom(
        this._store$.pipe(select(selectJiraIssueIds)),
        this._store$.pipe(select(selectJiraIssueEntities)),
      ),
      tap(([x, issueIds, entities]: [number, string[], Dictionary<JiraIssue>]) => {
        console.log('JIRA POLL CHANGES', x, issueIds, entities);
        if (issueIds && issueIds.length > 0) {
          this._snackService.open({
            message: 'Jira: Polling Changes for issues',
            svgIcon: 'jira',
            isSubtle: true,
          });
          issueIds.forEach((id) => this._jiraIssueService.updateIssueFromApi(id, entities[id], true, false));
        }
      }),
    );

  @Effect() pollNewIssuesToBacklog$: any = this._actions$
    .pipe(
      ofType(
        ProjectActionTypes.LoadProjectRelatedDataSuccess,
        ProjectActionTypes.UpdateProjectIssueProviderCfg,
        JiraIssueActionTypes.LoadState,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectProjectJiraCfg)),
      ),
      filter(isEnabled),
      filter(([a, jiraCfg]) => jiraCfg.isAutoAddToBacklog),
      switchMap(() => timer(JIRA_INITIAL_POLL_BACKLOG_DELAY, JIRA_POLL_INTERVAL)),
      tap(() => console.log('JIRA_POLL_BACKLOG_CHANGES')),
      map(() => new AddOpenJiraIssuesToBacklog())
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
        this._store$.pipe(select(selectCurrentProjectId)),
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
        this._store$.pipe(select(selectProjectJiraCfg)),
        this._store$.pipe(select(selectJiraIssueEntities)),
        this._store$.pipe(select(selectTaskEntities)),
      ),
      filter(isEnabled),
      tap(([act_, jiraCfg, jiraEntities, taskEntities]) => {
        const act = act_ as UpdateTask;
        const taskId = act.payload.task.id;
        const isDone = act.payload.task.changes.isDone;
        const task = taskEntities[taskId];

        if (isDone && jiraCfg && jiraCfg.isWorklogEnabled
          && task && task.issueType === JIRA_TYPE
          && !(jiraCfg.isAddWorklogOnSubTaskDone && task.subTaskIds.length > 0)) {
          this._openWorklogDialog(task, jiraEntities[task.issueId]);

        } else {
          const parent = task.parentId && taskEntities[task.parentId];
          if (isDone && parent && jiraCfg.isAddWorklogOnSubTaskDone && parent.issueType === JIRA_TYPE) {
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
        this._store$.pipe(select(selectProjectJiraCfg)),
        this._store$.pipe(select(selectCurrentTaskParentOrCurrent)),
        this._store$.pipe(select(selectJiraIssueEntities)),
      ),
      filter(isEnabled),
      filter(([action, jiraCfg, currentTaskOrParent, issueEntities]) =>
        jiraCfg.isCheckToReAssignTicketOnTaskStart
        && currentTaskOrParent && currentTaskOrParent.issueType === JIRA_TYPE),
      // show every 15s max to give time for updates
      throttleTime(15000),
      // TODO there is probably a better way to to do this
      // TODO refactor to actions
      switchMap(([action, jiraCfg, currentTaskOrParent, issueEntities]) => {
        const issue = issueEntities[currentTaskOrParent.issueId];
        const assignee = issue.assignee;
        const currentUserName = jiraCfg.userAssigneeName || jiraCfg.userName;
        if (!issue.assignee || issue.assignee.name !== currentUserName) {
          return this._matDialog.open(DialogConfirmComponent, {
            restoreFocus: true,
            data: {
              okTxt: 'Do it!',
              // tslint:disable-next-line
              message: `<strong>${issue.summary}</strong> is currently assigned to <strong>${assignee ? assignee.displayName : 'nobody'}</strong>. Do you want to assign it to yourself?`,
            }
          }).afterClosed()
            .pipe(
              switchMap((isConfirm) => {
                return isConfirm
                  ? this._jiraApiService.updateAssignee(issue.id, currentUserName)
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

  @Effect({dispatch: false}) checkForStartTransition$: any = this._actions$
    .pipe(
      ofType(
        TaskActionTypes.SetCurrentTask,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectProjectJiraCfg)),
        this._store$.pipe(select(selectCurrentTaskParentOrCurrent)),
        this._store$.pipe(select(selectJiraIssueEntities)),
      ),
      filter(isEnabled),
      tap(([action, jiraCfg, curOrParTask, issueEntities]) => {
        if (jiraCfg && jiraCfg.isTransitionIssuesEnabled && curOrParTask && curOrParTask.issueType === JIRA_TYPE) {
          const issueData = issueEntities[curOrParTask.issueId];
          this._handleTransitionForIssue('IN_PROGRESS', jiraCfg, issueData);
        }
      })
    );

  @Effect({dispatch: false}) checkForDoneTransition$: any = this._actions$
    .pipe(
      ofType(
        TaskActionTypes.UpdateTask,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectProjectJiraCfg)),
        this._store$.pipe(select(selectTaskFeatureState)),
        this._store$.pipe(select(selectJiraIssueEntities)),
      ),
      filter(isEnabled),
      tap(([action, jiraCfg, taskState, issueEntities]: [UpdateTask, JiraCfg, TaskState, Dictionary<JiraIssue>]) => {
        const task = taskState.entities[action.payload.task.id];
        if (jiraCfg && jiraCfg.isTransitionIssuesEnabled && task && task.issueType === JIRA_TYPE && task.isDone) {
          const issueData = issueEntities[task.issueId];
          this._handleTransitionForIssue('DONE', jiraCfg, issueData);
        }
      })
    );

  constructor(private readonly _actions$: Actions,
              private readonly _store$: Store<any>,
              private readonly _configService: ConfigService,
              private readonly _snackService: SnackService,
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

  private _handleTransitionForIssue(localState: IssueLocalState, jiraCfg: JiraCfg, issue: JiraIssue) {
    const chosenTransition: JiraTransitionOption = jiraCfg.transitionConfig[localState];

    if (!chosenTransition) {
      this._snackService.open({type: 'ERROR', message: 'Jira: No transition configured'});
      throw new Error('Jira: No transition configured');
    }

    switch (chosenTransition) {
      case 'DO_NOT':
        return;
      case 'ALWAYS_ASK':
        return this._openTransitionDialog(issue, localState);
      default:
        if (!issue.status || issue.status.name !== chosenTransition.name) {
          this._jiraApiService.transitionIssue(issue.id, chosenTransition.id)
            .pipe(take(1))
            .subscribe(() => {
              this._jiraIssueService.updateIssueFromApi(issue.id, issue, false, false);
              this._snackService.open({
                type: 'SUCCESS',
                message: `Jira: Set issue ${issue.key} to <strong>${chosenTransition.name}</strong>`,
                isSubtle: true,
              });
            });
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

  private _openTransitionDialog(issue: JiraIssue, localState: IssueLocalState) {
    this._matDialog.open(DialogJiraTransitionComponent, {
      restoreFocus: true,
      data: {
        issue,
        localState,
      }
    }).afterClosed()
      .subscribe();
  }

  private _importNewIssuesToBacklog([action, allTasks]: [Actions, Task[]]) {
    this._jiraApiService.findAutoImportIssues().subscribe(async (issues: JiraIssue[]) => {
      if (!Array.isArray(issues)) {
        return;
      }
      const allTaskJiraIssueIds = await this._taskService.getAllIssueIds(JIRA_TYPE) as string[];
      console.log('_importNewIssuesToBacklog Jira', allTaskJiraIssueIds, issues);

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
          message: `Jira: Imported issue "${issuesToAdd[0].key} ${issuesToAdd[0].summary}" from git to backlog`,
          icon: 'cloud_download',
          isSubtle: true,
        });
      } else if (issuesToAdd.length > 1) {
        this._snackService.open({
          message: `Jira: Imported ${issuesToAdd.length} new issues from Jira to backlog`,
          icon: 'cloud_download',
          isSubtle: true,
        });
      }
    });
  }
}

