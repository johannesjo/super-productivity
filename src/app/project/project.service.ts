import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ProjectCfg } from './project';
import { PersistenceService } from '../core/persistence/persistence.service';
import { ProjectDataLsKey } from '../core/persistence/persistence';

@Injectable()
export class ProjectService {

  // TODO get from store
  currentProjectMeta$: Observable<ProjectCfg>;
  projects$: Observable<ProjectCfg[]>;

  // HOW TO
  // update project data either directly from the observables or
  // hook into all the actions to check for when data needs saving

  constructor(private readonly _persistenceService: PersistenceService) {
    const projects = this._persistenceService.loadProjectsMeta();
  }

  setCurrentProject(projectId) {
    // ...
    // dispatch all necessary actions here
    // this._persistenceService.loadProjectData(projectId);
  }

  saveProjectCfg(projectId, cfg: ProjectCfg) {
    this._persistenceService.saveProjectData(projectId, 'cfg', cfg);
  }

  saveProjectData(projectId, dataKey: ProjectDataLsKey, cfg: ProjectCfg) {
    this._persistenceService.saveProjectData(projectId, dataKey, cfg);
  }

  load() {
    // store.dispatch to update obs
  }
}
