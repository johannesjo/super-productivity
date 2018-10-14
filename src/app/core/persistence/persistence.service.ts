import { Injectable } from '@angular/core';
import { ProjectDataLsKey } from './persistence';
import { LS_PROJECT_PREFIX } from './ls-keys.const';
import { LS_GLOBAL_CFG } from './ls-keys.const';
import { LS_PROJECT_META_LIST } from './ls-keys.const';
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

  // HOW TO STORE STRUCTURE
  // [projectId][ProjectDataLsKey]
  // globalCfg:any

  // PROJECT DATA
  // -------------
  // loads partial project data
  // TODO check naming
  saveTasksForProject(projectId, subKey: ProjectDataLsKey, data) {
    console.log('saveProjectData XXX');
    saveToLs(PersistenceService._makeProjectKey(projectId, subKey), data);
  }

  // TODO add correct type
  loadTasksForProject(projectId, subKey: ProjectDataLsKey): any {
    return loadFromLs(PersistenceService._makeProjectKey(projectId, subKey));
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
