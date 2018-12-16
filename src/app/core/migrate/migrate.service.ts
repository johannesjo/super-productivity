import { Injectable } from '@angular/core';
import { loadFromLs } from '../persistence/local-storage';
import { STORAGE_CURRENT_PROJECT, STORAGE_PROJECTS } from './migrate.const';
import { DialogConfirmComponent } from '../../ui/dialog-confirm/dialog-confirm.component';
import { MatDialog } from '@angular/material';
import { LS_IS_V1_MIGRATE } from '../persistence/ls-keys.const';
import { SnackService } from '../snack/snack.service';
import { PersistenceService } from '../persistence/persistence.service';
import { SyncService } from '../sync/sync.service';
import { OldJiraSettings, OldProject, OldTask } from './migrate.model';
import { ProjectService } from '../../project/project.service';
import { JiraCfg } from '../../issue/jira/jira';
import { DEFAULT_JIRA_CFG } from '../../issue/jira/jira.const';
import { initialTaskState } from '../../tasks/store/task.reducer';
import { EntityState } from '@ngrx/entity';
import { DEFAULT_TASK, Task } from '../../tasks/task.model';
import * as moment from 'moment';

@Injectable({
  providedIn: 'root'
})
export class MigrateService {

  constructor(
    private _matDialog: MatDialog,
    private _snackService: SnackService,
    private _persistenceService: PersistenceService,
    private _syncService: SyncService,
    private _projectService: ProjectService,
  ) {
  }

  checkForUpdate() {
    const isMigrated = loadFromLs(LS_IS_V1_MIGRATE);
    const currentProjectData = loadFromLs(STORAGE_CURRENT_PROJECT);

    if (currentProjectData) {
      this._matDialog.open(DialogConfirmComponent, {
        restoreFocus: true,
        data: {
          okTxt: 'Do it!',
          /* tslint:disable */
          message: `<h2>Super Productivity V1 Data found</h2><p>Do you want to migrate it? Please note that only projects and tasks are migrated, but not your project configuration.</p><p>Please also note that the migration process might not be working as you would expect. There is probably a lot you need to tweak afterwards and it might even happen that the process fails completely, so making a backup of your data is highly recommended.</p>`,
          /* tslint:enable */
        }
      }).afterClosed()
        .subscribe((isConfirm: boolean) => {
          if (isConfirm) {
            this._migrateData().then(() => {

            });
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
      } else {
        const currentProjectData = loadFromLs(STORAGE_CURRENT_PROJECT);
        await this._importProject(currentProjectData);
      }
      this._snackService.open({type: 'SUCCESS', message: 'Data imported'});

    } catch (e) {
      this._snackService.open({type: 'ERROR', message: 'Something went wrong while importing the data. Falling back to local backup'});
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
      }
    });

    const todayIds = op.data.tasks.map(t => t.id);
    const backlogIds = op.data.backlogTasks.map(t => t.id);

    const taskState = this._transformTasks(op.data.tasks.concat(op.data.backlogTasks));
    await this._persistenceService.saveTasksForProject(op.id, {
      ...initialTaskState,
      ...taskState,
      todaysTaskIds: todayIds,
      backlogTaskIds: backlogIds,
    });

    const doneTaskState = this._transformTasks(op.data.doneBacklogTasks);
    await this._persistenceService.saveToTaskArchiveForProject(op.id, {
      ...doneTaskState,
    });
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

      title: ot.title,
      id: ot.id,
      issueId: ot.originalId,
      issueType: ot.originalType,
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
