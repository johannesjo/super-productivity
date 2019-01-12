import { Injectable } from '@angular/core';
import { loadFromLs, saveToLs } from '../../core/persistence/local-storage';
import {
  STORAGE_BACKLOG_TASKS,
  STORAGE_CURRENT_PROJECT,
  STORAGE_DONE_BACKLOG_TASKS,
  STORAGE_JIRA_SETTINGS,
  STORAGE_PROJECTS,
  STORAGE_TASKS,
  STORAGE_THEME
} from './migrate.const';
import { MatDialog } from '@angular/material';
import { LS_IS_V1_MIGRATE } from '../../core/persistence/ls-keys.const';
import { SnackService } from '../../core/snack/snack.service';
import { PersistenceService } from '../../core/persistence/persistence.service';
import { SyncService } from '../../imex/sync/sync.service';
import { OldGitSettings, OldJiraSettings, OldProject, OldTask } from './migrate.model';
import { ProjectService } from '../../project/project.service';
import { JiraCfg } from '../../issue/jira/jira';
import { DEFAULT_JIRA_CFG } from '../../issue/jira/jira.const';
import { initialTaskState } from '../../tasks/store/task.reducer';
import { EntityState } from '@ngrx/entity';
import { DEFAULT_TASK, Task } from '../../tasks/task.model';
import * as moment from 'moment';
import { JiraIssue } from '../../issue/jira/jira-issue/jira-issue.model';
import { GitIssue } from '../../issue/git/git-issue/git-issue.model';
import { IssueProviderKey } from '../../issue/issue';
import { GitCfg } from '../../issue/git/git';
import { DEFAULT_GIT_CFG } from '../../issue/git/git.const';
import { GitApiService } from '../../issue/git/git-api.service';
import { first } from 'rxjs/operators';
import { DialogMigrateComponent } from './dialog-migrate/dialog-migrate.component';
import { JiraIssueState } from '../../issue/jira/jira-issue/store/jira-issue.reducer';
import { GitIssueState } from '../../issue/git/git-issue/store/git-issue.reducer';

@Injectable({
  providedIn: 'root'
})
export class MigrateService {

  private _issueTypeMap = {
    'GITHUB': 'GIT',
    'JIRA': 'JIRA',
  };

  constructor(
    private _matDialog: MatDialog,
    private _snackService: SnackService,
    private _persistenceService: PersistenceService,
    private _syncService: SyncService,
    private _projectService: ProjectService,
    private _gitApiService: GitApiService,
  ) {
  }

  checkForUpdate() {
    const isMigrated = loadFromLs(LS_IS_V1_MIGRATE);
    // const isMigrated = localStorage.getItem(LS_IS_V1_MIGRATE);
    if (!isMigrated && loadFromLs(STORAGE_TASKS)) {
      this._matDialog.open(DialogMigrateComponent, {
        restoreFocus: true,
      }).afterClosed()
        .subscribe((res: any) => {
          if (res === 1) {
            this._migrateData().then(() => {
              // set flag to not ask again
              saveToLs(LS_IS_V1_MIGRATE, true);
            });
          } else if (res === 2) {
            // set flag to not ask again
            saveToLs(LS_IS_V1_MIGRATE, true);
          }
        });
    }
  }

  private async _migrateData() {
    this._snackService.open({message: 'Importing data', icon: 'cloud_download'});
    await this._saveBackup();
    try {
      const allProjects = loadFromLs(STORAGE_PROJECTS);

      if (allProjects && allProjects.length > 0) {
        const importPromises: Promise<any>[] = allProjects.map((projectData: OldProject) => this._importProject(projectData));
        await Promise.all(importPromises);
      } else if (loadFromLs(STORAGE_CURRENT_PROJECT)) {
        const currentProjectData = loadFromLs(STORAGE_CURRENT_PROJECT);
        await this._importProject(currentProjectData);
      } else {
        await this._importProject({
          title: 'Imported Default Project',
          id: 'OLD_DEFAULT',
          data: {
            tasks: loadFromLs(STORAGE_TASKS) || [],
            backlogTasks: loadFromLs(STORAGE_BACKLOG_TASKS) || [],
            doneBacklogTasks: loadFromLs(STORAGE_DONE_BACKLOG_TASKS) || [],
            theme: loadFromLs(STORAGE_THEME) || 'blue',
            jiraSettings: loadFromLs(STORAGE_JIRA_SETTINGS) || {},
          }
        });
      }
      this._snackService.open({type: 'SUCCESS', message: 'Data imported'});
    } catch (e) {
      this._snackService.open({
        type: 'ERROR',
        message: 'Something went wrong while importing the data. Falling back to local backup'
      });
      console.error(e);
      return await this._loadBackup();
    }
  }

  private async _importProject(op: OldProject) {
    this._projectService.upsert({
      id: op.id,
      title: op.title,
      themeColor: op.data.theme.replace('-theme', '').replace('-dark', ''),
      isDarkTheme: !!op.data.theme.match(/dark/),
      issueIntegrationCfgs: {
        JIRA: (op.data.jiraSettings && op.data.jiraSettings.isJiraEnabled)
          ? this._transformJiraCfg(op.data.jiraSettings)
          : null,
        GIT: (op.data.git && op.data.git.repo)
          ? this._transformGitCfg(op.data.git)
          : null,
      }
    });

    const allTasks = op.data.tasks.concat(op.data.backlogTasks, op.data.doneBacklogTasks);

    const jiraIssueState = this._getJiraIssuesFromTasks(allTasks);
    if (jiraIssueState) {
      await this._persistenceService.saveIssuesForProject(op.id, 'JIRA', jiraIssueState);
    }
    let gitIssueState = this._getGitIssuesFromTasks(allTasks);
    let freshIssues;

    if (gitIssueState) {
      const issueNumbers = gitIssueState.ids as number[];
      if (op.data.git.repo) {
        try {
          gitIssueState = await this._getFreshIssueState(op.data.git.repo, issueNumbers);
          const ids = gitIssueState.ids as number[];
          freshIssues = ids.map(id => gitIssueState.entities[id]);
        } catch (e) {
          console.error('unable to refresh issue data', e);
        }
        await this._persistenceService.saveIssuesForProject(op.id, 'GIT', gitIssueState);
      }
    }

    // TASKS
    const todayIds = op.data.tasks.map(t => t.id);
    const backlogIds = op.data.backlogTasks.map(t => t.id);
    const doneBacklogIds = op.data.doneBacklogTasks.map(t => t.id);

    if (freshIssues) {
      this._remapGitIssueIds(allTasks, freshIssues);
    }

    const taskState = this._transformTasks(op.data.tasks.concat(op.data.backlogTasks));
    await this._persistenceService.saveTasksForProject(op.id, {
      ...initialTaskState,
      ...taskState,
      todaysTaskIds: todayIds,
      backlogTaskIds: backlogIds,
    });

    const doneTaskState = this._transformTasks(op.data.doneBacklogTasks);
    await this._persistenceService.saveToTaskArchiveForProject(op.id, doneTaskState);
  }

  private _remapGitIssueIds(tasks: OldTask[], freshIssues: GitIssue[]) {
    tasks.forEach((task) => {
      if (task && task.originalId && task.originalType === 'GITHUB') {
        task.originalId = freshIssues.find(issue => issue.number.toString() === task.originalId.toString()).id.toString();
      }
    });
  }

  private async _getFreshIssueState(repo: string, issueNumbers: number[]): Promise<EntityState<GitIssue>> {
    const refreshedIssues = await this._gitApiService.getCompleteIssueDataForRepo(repo, true).pipe(first()).toPromise();
    const freshMappedIssues = refreshedIssues.filter(issue => issueNumbers.includes(issue.number));

    return {
      entities: freshMappedIssues.reduce((acc, issue) => {
        return {
          ...acc,
          [issue.id]: issue
        };
      }, {}),
      ids: freshMappedIssues.map(issue => issue.id),
    };
  }

  private _getGitIssuesFromTasks(oldTasks: OldTask[]): GitIssueState | null {
    const flatTasks = oldTasks
      .filter(t => !!t)
      .reduce((acc, t) => acc.concat(t.subTasks, [t]), [])
      .filter(t => !!t);
    const transformedIssues = flatTasks
      .filter(t => {
        return t.originalId && t.originalType === 'GITHUB';
      })
      .map(this._transformGitIssue);

    if (!transformedIssues || !transformedIssues.length) {
      return null;
    }

    return {
      entities: transformedIssues.reduce((acc, issue) => {
        return {
          ...acc,
          [issue.id]: issue
        };
      }, {}),
      ids: transformedIssues.map(issue => issue.id),
    };
  }

  private _getJiraIssuesFromTasks(oldTasks: OldTask[]): JiraIssueState | null {
    const flatTasks = oldTasks
      .filter(t => !!t)
      .reduce((acc, t) => acc.concat(t.subTasks, [t]), [])
      .filter(t => !!t);
    const transformedIssues = flatTasks
      .filter(t => t.originalId && t.originalType === 'JIRA')
      .map(this._transformJiraIssue);

    if (!transformedIssues || !transformedIssues.length) {
      return null;
    }

    return {
      entities: transformedIssues.reduce((acc, issue) => {
        return {
          ...acc,
          [issue.id]: issue
        };
      }, {}),
      ids: transformedIssues.map(issue => issue.id),
    };
  }


  private _transformGitIssue(ot: OldTask): GitIssue {
    return {
      // copied data
      id: +ot.originalId,
      _id: +ot.originalId,
      number: +ot.originalId,
      title: ot.title,
      body: ot.notes,
      url: ot.originalLink,
      state: ot.originalStatus,
      repository_url: null,
      labels_url: null,
      comments_url: null,
      events_url: null,
      html_url: null,
      user: null,
      labels: [],
      assignee: null,
      milestone: null,
      locked: false,
      active_lock_reason: null,
      pull_request: null,
      closed_at: null,
      created_at: null,
      updated_at: null,

      // added
      wasUpdated: false,
      commentsNr: 0,
      apiUrl: null,
      comments: [],
    };
  }

  private _transformJiraIssue(ot: OldTask): JiraIssue {
    return {
      // copied data
      key: ot.originalKey,
      id: ot.originalId,
      summary: ot.title,
      timeestimate: ot.originalEstimate,
      timespent: 0,
      description: ot.notes,
      updated: ot.originalUpdated,
      url: ot.originalLink,

      // not enough data on old model
      components: [],
      status: null,
      attachments: [],
      assignee: null,
      changelog: null,

      // new properties
      comments: [],
    };
  }

  private _transformTasks(oldTasks: OldTask[]): EntityState<Task> {
    // remove null entries
    const cleanOldTasks = oldTasks.filter(ot => !!ot);

    const transformedSubTasks = [];
    const transformedMainTasks = cleanOldTasks.map((ot, i) => {
      if (ot.subTasks && ot.subTasks.length) {
        ot.subTasks.forEach(otSub => otSub && transformedSubTasks.push(this._transformTask(otSub)));
      }
      return this._transformTask(ot);
    });
    const transformedTasks = transformedMainTasks.concat(transformedSubTasks);

    return {
      entities: transformedTasks.reduce((acc, t) => {
        return {
          ...acc,
          [t.id]: t
        };
      }, {}),
      ids: transformedTasks.map(t => t.id),
    };
  }

  private _transformTask(ot: OldTask): Task {
    return {
      ...DEFAULT_TASK,
      attachmentIds: [],
      _isAdditionalInfoOpen: false,
      _currentTab: 0,
      parentId: ot.parentId,
      title: ot.title,
      id: ot.id,
      issueId: ot.originalId,
      issueType: this._issueTypeMap[ot.originalType] as IssueProviderKey,
      isDone: ot.isDone,
      notes: ot.notes,
      subTaskIds: (ot.subTasks && ot.subTasks.length > 0) ? ot.subTasks.map(t => t.id) : [],
      timeSpentOnDay: ot.timeSpentOnDay
        ? Object.keys(ot.timeSpentOnDay).reduce((acc, key) => {
          return {
            ...acc,
            [key]: this._transformMomentDurationStrToMs(ot.timeSpentOnDay[key]),
          };
        }, {})
        : {},
      timeEstimate: this._transformMomentDurationStrToMs(ot.timeEstimate),
      timeSpent: this._transformMomentDurationStrToMs(ot.timeSpent),
      created: this._transformMomentStrToTimeStamp(ot.created),
    };
  }

  private _transformMomentStrToTimeStamp(momStr: string): number {
    return moment(momStr).unix();
  }

  private _transformMomentDurationStrToMs(momStr: string): number {
    return moment.duration(momStr).asMilliseconds();
  }

  private _transformGitCfg(oldCfg: OldGitSettings): GitCfg {
    return {
      ...DEFAULT_GIT_CFG,
      repo: oldCfg.repo,
      isSearchIssuesFromGit: oldCfg.isShowIssuesFromGit,
      isAutoPoll: oldCfg.isAutoImportToBacklog,
      isAutoAddToBacklog: oldCfg.isAutoImportToBacklog,
    };
  }

  private _transformJiraCfg(oldCfg: OldJiraSettings): JiraCfg {
    return {
      ...DEFAULT_JIRA_CFG,
      isEnabled: oldCfg.isJiraEnabled,
      host: oldCfg.host,
      userName: oldCfg.userName,
      password: oldCfg.password,
      isAutoPollTickets: oldCfg.isAutoPollTickets,
      searchJqlQuery: oldCfg.jqlQuery,
      isAutoAddToBacklog: oldCfg.isAutoWorklog,
      autoAddBacklogJqlQuery: oldCfg.jqlQueryAutoAdd,
      isWorklogEnabled: oldCfg.isWorklogEnabled,
      isAutoWorklog: oldCfg.isAutoWorklog,
      isAddWorklogOnSubTaskDone: oldCfg.isAddWorklogOnSubTaskDone,
      isUpdateIssueFromLocal: oldCfg.isUpdateIssueFromLocal,
      isShowComponents: oldCfg.isShowComponents,
      isCheckToReAssignTicketOnTaskStart: oldCfg.isCheckToReAssignTicketOnTaskStart,
      userAssigneeName: oldCfg.userAssigneeName,
      isTransitionIssuesEnabled: oldCfg.isTransitionIssuesEnabled,
      userToAssignOnDone: oldCfg.userAssigneeName,
    };
  }

  private async _saveBackup(): Promise<any> {
    return await this._persistenceService.saveBackup();
  }

  private async _loadBackup(): Promise<any> {
    const data = await this._persistenceService.loadBackup();
    return this._syncService.loadCompleteSyncData(data);
  }
}
