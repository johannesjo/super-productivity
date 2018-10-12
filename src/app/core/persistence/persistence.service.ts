import { Injectable } from '@angular/core';
import { ProjectDataLsKey } from './persistence';

@Injectable({
  providedIn: 'root'
})
export class PersistenceService {
  constructor() {
  }

  // HOW TO STORE STRUCTURE
  // [projectId][ProjectDataLsKey]
  // globalCfg:any

  // PROJECT DATA
  // -------------
  // loads partial project data
  saveProjectData(projectId, lsKey: ProjectDataLsKey, data) {
  }

  loadProjectData(projectId, lsKey: ProjectDataLsKey, data) {
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
