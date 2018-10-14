import { Injectable } from '@angular/core';
import { LS_PROJECT_PREFIX } from './ls-keys.const';
import { LS_GLOBAL_CFG } from './ls-keys.const';
import { LS_PROJECT_META_LIST } from './ls-keys.const';
import { LS_TASK_STATE } from './ls-keys.const';
import { GlobalConfig } from '../config/config.model';
import { saveToLs } from './local-storage';
import { loadFromLs } from './local-storage';

@Injectable({
  providedIn: 'root'
})
export class PersistenceService {
  constructor() {
  }

  static _makeProjectKey(projectId, subKey) {
    return LS_PROJECT_PREFIX + projectId + '_' + subKey;
  }

  // PROJECT DATA
  // -------------
  // TODO check naming
  saveTasksForProject(projectId, data) {
    // console.log(projectId, PersistenceService._makeProjectKey(projectId, LS_TASK_STATE), data);
    saveToLs(PersistenceService._makeProjectKey(projectId, LS_TASK_STATE), data);
  }

  // TODO add correct type
  loadTasksForProject(projectId): any {
    // console.log(projectId, PersistenceService._makeProjectKey(projectId, LS_TASK_STATE));
    return loadFromLs(PersistenceService._makeProjectKey(projectId, LS_TASK_STATE));
  }

  loadProjectsMeta() {
    return loadFromLs(LS_PROJECT_META_LIST);
  }

  saveProjectsMeta(projectData) {
    saveToLs(LS_PROJECT_META_LIST, projectData);
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
