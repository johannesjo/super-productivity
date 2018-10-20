import { Injectable } from '@angular/core';
import { LS_GLOBAL_CFG, LS_JIRA_ISSUE_STATE, LS_PROJECT_META_LIST, LS_PROJECT_PREFIX, LS_TASK_STATE } from './ls-keys.const';
import { GlobalConfig } from '../config/config.model';
import { loadFromLs, saveToLs } from './local-storage';
import { IssueProviderKey } from '../../issue/issue';

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

  saveProjectsMeta(projectData) {
    saveToLs(LS_PROJECT_META_LIST, projectData);
  }

  // TODO check naming
  saveTasksForProject(projectId, data) {
    saveToLs(PersistenceService._makeProjectKey(projectId, LS_TASK_STATE), data);
  }

  // TODO add correct type
  loadTasksForProject(projectId): any {
    return loadFromLs(PersistenceService._makeProjectKey(projectId, LS_TASK_STATE));
  }


  saveIssuesForProject(projectId, issueType: IssueProviderKey, data) {
    saveToLs(PersistenceService._makeProjectKey(projectId, LS_JIRA_ISSUE_STATE, issueType), data);
  }

  // TODO add correct type
  loadIssuesForProject(projectId, issueType: IssueProviderKey): any {
    return loadFromLs(PersistenceService._makeProjectKey(projectId, LS_JIRA_ISSUE_STATE, issueType));
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
