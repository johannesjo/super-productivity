import { Injectable } from '@angular/core';
import { LS_GLOBAL_CFG, LS_ISSUE_STATE, LS_PROJECT_META_LIST, LS_PROJECT_PREFIX, LS_TASK_STATE } from './ls-keys.const';
import { GlobalConfig } from '../config/config.model';
import { loadFromLs, saveToLs } from './local-storage';
import { IssueProviderKey } from '../../issue/issue';
import { ProjectState } from '../../project/store/project.reducer';
import { TaskState } from '../../tasks/store/task.reducer';
import { JiraIssueState } from '../../issue/jira/jira-issue/store/jira-issue.reducer';

@Injectable({
  providedIn: 'root'
})
export class PersistenceService {
  constructor() {
  }

  private static _makeProjectKey(projectId, subKey, additional?) {
    return LS_PROJECT_PREFIX + projectId + '_' + subKey + (additional ? '_' + additional : '');
  }

  // PROJECT DATA
  // -------------
  loadProjectsMeta() {
    return loadFromLs(LS_PROJECT_META_LIST);
  }

  saveProjectsMeta(projectData: ProjectState) {
    saveToLs(LS_PROJECT_META_LIST, projectData);
  }

  saveTasksForProject(projectId, taskState: TaskState) {
    saveToLs(PersistenceService._makeProjectKey(projectId, LS_TASK_STATE), taskState);
  }

  loadTasksForProject(projectId): TaskState {
    return loadFromLs(PersistenceService._makeProjectKey(projectId, LS_TASK_STATE));
  }


  saveIssuesForProject(projectId, issueType: IssueProviderKey, data: JiraIssueState) {
    saveToLs(PersistenceService._makeProjectKey(projectId, LS_ISSUE_STATE, issueType), data);
  }

  // TODO add correct type
  loadIssuesForProject(projectId, issueType: IssueProviderKey): any {
    return loadFromLs(PersistenceService._makeProjectKey(projectId, LS_ISSUE_STATE, issueType));
  }


  // do once on startup
  updateProjectsMetaFromProjectData() {
  }

  deleteProject() {
    // deletes meta and tasks
  }


  // GLOBAL CONFIG
  // -------------
  loadGlobalConfig() {
    return loadFromLs(LS_GLOBAL_CFG);
  }

  saveGlobalConfig(globalConfig: GlobalConfig) {
    saveToLs(LS_GLOBAL_CFG, globalConfig);
  }
}
