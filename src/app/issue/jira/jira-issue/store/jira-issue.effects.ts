import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { JiraIssueActionTypes } from './jira-issue.actions';
import { select, Store } from '@ngrx/store';
import { tap, withLatestFrom } from 'rxjs/operators';
import { TaskActionTypes, UpdateTask } from '../../../../tasks/store/task.actions';
import { PersistenceService } from '../../../../core/persistence/persistence.service';
import { selectJiraIssueEntities, selectJiraIssueFeatureState, selectJiraIssueIds } from './jira-issue.reducer';
import { selectCurrentProjectId, selectProjectJiraCfg } from '../../../../project/store/project.reducer';
import { JiraApiService } from '../../jira-api.service';
import { JiraIssueService } from '../jira-issue.service';
import { JIRA_INITIAL_POLL_DELAY, JIRA_POLL_INTERVAL } from '../../jira.const';
import { ConfigService } from '../../../../core/config/config.service';
import { Dictionary } from '@ngrx/entity';
import { JiraIssue } from '../jira-issue.model';
import { JiraCfg } from '../../jira';
import { SnackService } from '../../../../core/snack/snack.service';
import { ProjectActionTypes } from '../../../../project/store/project.actions';
import { Task } from '../../../../tasks/task.model';
import { JIRA_TYPE } from '../../../issue.const';
import { selectAllTasks, selectCurrentTask, selectTaskFeatureState } from '../../../../tasks/store/task.selectors';
import { TaskService } from '../../../../tasks/task.service';
import { Subscription, timer } from 'rxjs';
import { TaskState } from '../../../../tasks/store/task.reducer';
import { MatDialog } from '@angular/material';
import { DialogJiraTransitionComponent } from '../../dialog-jira-transition/dialog-jira-transition.component';
import { IssueLocalState } from '../../../issue';

@Injectable()
export class JiraIssueEffects {
  @Effect({dispatch: false}) issuePolling$: any = this._actions$
    .pipe(
      ofType(
        ProjectActionTypes.SetCurrentProject,
        TaskActionTypes.AddTask,
        TaskActionTypes.DeleteTask,
        TaskActionTypes.RestoreTask,
        TaskActionTypes.MoveToArchive,
        JiraIssueActionTypes.LoadState,
        JiraIssueActionTypes.LoadJiraIssues,
        JiraIssueActionTypes.AddJiraIssue,
        JiraIssueActionTypes.DeleteJiraIssue,

        // also needs to be here to reinit entity data
        JiraIssueActionTypes.UpdateJiraIssue,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectJiraIssueIds)),
        this._store$.pipe(select(selectJiraIssueEntities)),
        this._store$.pipe(select(selectProjectJiraCfg)),
      ),
      // TODO should be done in a more modern way via switchmap and timer
      tap(this._reInitIssuePolling.bind(this))
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


  @Effect({dispatch: false}) checkForStartTransition$: any = this._actions$
    .pipe(
      ofType(
        TaskActionTypes.SetCurrentTask,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectProjectJiraCfg)),
        this._store$.pipe(select(selectCurrentTask)),
        this._store$.pipe(select(selectJiraIssueEntities)),
      ),
      tap(([action, jiraCfg, currentTask, issueEntities]) => {
        if (jiraCfg.isTransitionIssuesEnabled && currentTask && currentTask.issueType === 'JIRA') {
          const issueData = issueEntities[currentTask.issueId];
          this._openTransitionDialog(issueData, 'IN_PROGRESS');
          // TODO transition directly if option is set
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
      tap(([action, jiraCfg, taskState, issueEntities]: [UpdateTask, JiraCfg, TaskState, Dictionary<JiraIssue>]) => {
        const task = taskState.entities[action.payload.task.id];
        if (jiraCfg.isTransitionIssuesEnabled && task && task.issueType === 'JIRA' && task.isDone) {
          const issueData = issueEntities[task.issueId];
          this._openTransitionDialog(issueData, 'DONE');
          // TODO transition directly if option is set
        }
      })
    );


  private _pollSub: Subscription;

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
      this._persistenceService.saveIssuesForProject(currentProjectId, 'JIRA', jiraIssueFeatureState);
    } else {
      throw new Error('No current project id');
    }
  }

  private _reInitIssuePolling(
    [action, issueIds, entities, jiraCfg]: [JiraIssueActionTypes, string[], Dictionary<JiraIssue>, JiraCfg]
  ) {

    if (this._pollSub) {
      this._pollSub.unsubscribe();
    }

    const isPollingEnabled = jiraCfg && jiraCfg.isEnabled && jiraCfg.isAutoPollTickets;

    if (isPollingEnabled && issueIds && issueIds.length) {
      this._pollSub = timer(JIRA_INITIAL_POLL_DELAY, JIRA_POLL_INTERVAL)
        .pipe(
          tap(() => {
            this._snackService.open({message: 'Jira: Polling Changes for issues', icon: 'cloud_download'});
            issueIds.forEach((id) => this._jiraIssueService.updateIssueFromApi(id, entities[id]));
          })
        ).subscribe();
    }
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
    this._jiraApiService.findAutoImportIssues().subscribe((issues: JiraIssue[]) => {
      let count = 0;
      let lastImportedIssue;
      issues.forEach(issue => {
        const isIssueAlreadyImported = allTasks.find(task => {
          return task.issueType === JIRA_TYPE && task.issueId === issue.id;
        });

        if (!isIssueAlreadyImported) {
          count++;
          lastImportedIssue = issue;
          this._taskService.addWithIssue(
            `${issue.key} ${issue.summary}`,
            JIRA_TYPE,
            issue,
            true,
          );
        }
      });

      if (count === 1) {
        this._snackService.open({
          message: `Jira: Imported issue "${lastImportedIssue.key} ${lastImportedIssue.title}" from git to backlog`,
          icon: 'cloud_download'
        });
      } else if (count > 1) {
        this._snackService.open({
          message: `Jira: Imported ${count} new issues from Jira to backlog`,
          icon: 'cloud_download'
        });
      }
    });
  }
}

