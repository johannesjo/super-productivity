import { Injectable } from '@angular/core';
import {
  LS_BACKUP,
  LS_GLOBAL_CFG,
  LS_ISSUE_STATE,
  LS_LAST_ACTIVE,
  LS_PROJECT_META_LIST,
  LS_PROJECT_PREFIX,
  LS_TASK_ARCHIVE,
  LS_TASK_STATE
} from './ls-keys.const';
import { GlobalConfig } from '../config/config.model';
import { loadFromLs, saveToLsWithLastActive } from './local-storage';
import { IssueProviderKey } from '../../issue/issue';
import { ProjectState } from '../../project/store/project.reducer';
import { TaskState } from '../../tasks/store/task.reducer';
import { JiraIssueState } from '../../issue/jira/jira-issue/store/jira-issue.reducer';
import { EntityState } from '@ngrx/entity';
import { Task } from '../../tasks/task.model';
import { AppDataComplete } from '../sync/sync.model';

@Injectable({
  providedIn: 'root'
})
export class PersistenceService {
  constructor() {
  }

  loadProjectsMeta(): ProjectState {
    return loadFromLs(LS_PROJECT_META_LIST);
  }

  saveProjectsMeta(projectData: ProjectState) {
    saveToLsWithLastActive(LS_PROJECT_META_LIST, projectData);
  }

  saveTasksForProject(projectId, taskState: TaskState) {
    saveToLsWithLastActive(this._makeProjectKey(projectId, LS_TASK_STATE), taskState);
  }

  loadTasksForProject(projectId): TaskState {
    return loadFromLs(this._makeProjectKey(projectId, LS_TASK_STATE));
  }

  saveToTaskArchiveForProject(projectId, tasksToArchive: EntityState<Task>) {
    const lsKey = this._makeProjectKey(projectId, LS_TASK_ARCHIVE);
    const currentArchive: EntityState<Task> = loadFromLs(lsKey);
    if (currentArchive) {
      const mergedEntities = {
        ids: [
          ...tasksToArchive.ids,
          ...currentArchive.ids
        ],
        entities: {
          ...currentArchive.entities,
          ...tasksToArchive.entities
        }
      };
      saveToLsWithLastActive(lsKey, mergedEntities);
    } else {
      saveToLsWithLastActive(lsKey, tasksToArchive);
    }
  }

  loadTaskArchiveForProject(projectId: string): EntityState<Task> {
    return loadFromLs(this._makeProjectKey(projectId, LS_TASK_ARCHIVE));
  }

  saveIssuesForProject(projectId, issueType: IssueProviderKey, data: JiraIssueState) {
    saveToLsWithLastActive(this._makeProjectKey(projectId, LS_ISSUE_STATE, issueType), data);
  }

  // TODO add correct type
  loadIssuesForProject(projectId, issueType: IssueProviderKey): JiraIssueState {
    return loadFromLs(this._makeProjectKey(projectId, LS_ISSUE_STATE, issueType));
  }


  // GLOBAL CONFIG
  // -------------
  loadGlobalConfig(): GlobalConfig {
    return loadFromLs(LS_GLOBAL_CFG);
  }

  saveGlobalConfig(globalConfig: GlobalConfig) {
    saveToLsWithLastActive(LS_GLOBAL_CFG, globalConfig);
  }

  // BACKUP AND SYNC RELATED
  // -----------------------
  getLastActive(): string {
    return loadFromLs(LS_LAST_ACTIVE);
  }

  loadBackup(): AppDataComplete {
    return loadFromLs(LS_BACKUP);
  }

  saveBackup() {
    saveToLsWithLastActive(LS_BACKUP, this.loadComplete());
  }

  loadComplete(): AppDataComplete {
    const crateProjectIdObj = (getDataFn: Function) => {
      return projectIds.reduce((acc, projectId) => {
        return {
          ...acc,
          [projectId]: getDataFn(projectId)
        };
      }, {});
    };

    const projectState = this.loadProjectsMeta();
    const projectIds = projectState.ids as string[];

    return {
      lastActiveTime: this.getLastActive(),
      project: this.loadProjectsMeta(),
      globalConfig: this.loadGlobalConfig(),
      task: crateProjectIdObj(this.loadTasksForProject.bind(this)),
      taskArchive: crateProjectIdObj(this.loadTaskArchiveForProject.bind(this)),
      issue: projectIds.reduce((acc, projectId) => {
        return {
          ...acc,
          [projectId]: {
            'JIRA': this.loadIssuesForProject(projectId, 'JIRA')
          }
        };
      }, {}),
    };
  }

  // TODO what is missing is a total cleanup of the existing projects and their data
  saveComplete(data: AppDataComplete) {
    const saveDataForProjectIds = (data_, saveDataFn: Function) => {
      Object.keys(data_).forEach(projectId => {
        if (data[projectId]) {
          saveDataFn(projectId, data[projectId]);
        }
      });
    };

    this.saveProjectsMeta(data.project);
    this.saveGlobalConfig(data.globalConfig);
    saveDataForProjectIds(data.task, this.saveTasksForProject.bind(this));
    saveDataForProjectIds(data.taskArchive, this.saveToTaskArchiveForProject.bind(this));
    Object.keys(data.issue).forEach(projectId => {
      const issueData = data.issue[projectId];
      Object.keys(issueData).forEach((issueProviderKey: IssueProviderKey) => {
        this.saveIssuesForProject(projectId, issueProviderKey, issueData[issueProviderKey]);
      });
    });
  }

  private _makeProjectKey(projectId, subKey, additional?) {
    return LS_PROJECT_PREFIX + projectId + '_' + subKey + (additional ? '_' + additional : '');
  }
}
