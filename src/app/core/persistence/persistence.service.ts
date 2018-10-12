import { Injectable } from '@angular/core';
import { ProjectDataLsKey } from './persistence';
import { saveToLs } from '../../util/local-storage';
import { loadFromLs } from '../../util/local-storage';
import { LS_PROJECT_PREFIX } from './ls-keys.const';

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
  saveProjectData(projectId, subKey: ProjectDataLsKey, data) {
    console.log('saveProjectData XXX');
    saveToLs(PersistenceService._makeProjectKey(projectId, subKey), data);
  }

  loadProjectData(projectId, subKey: ProjectDataLsKey) {
    loadFromLs(PersistenceService._makeProjectKey(projectId, subKey));
  }

  loadProjectsMeta() {
  }

  saveProjectsMeta() {
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
  }

  saveGlobalConfig() {
  }
}
