import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ProjectCfg } from './project';
import { PersistenceService } from '../core/persistence/persistence.service';
import { ProjectDataLsKey } from '../core/persistence/persistence';
import { LS_TASK_STATE } from '../core/persistence/ls-keys.const';

@Injectable()
export class ProjectService {

  // TODO get from store
  currentProjectMeta$: Observable<ProjectCfg>;
  projects$: Observable<ProjectCfg[]>;
  projectId = 'PROJECT_ID';

  // HOW TO
  // update project data either directly from the observables or
  // hook into all the actions to check for when data needs saving

  constructor(private readonly _persistenceService: PersistenceService) {
    const projects = this._persistenceService.loadProjectsMeta();
    console.log(_persistenceService);
    console.log(_persistenceService);
    console.log(_persistenceService.saveProjectData);

  }

  setCurrentProject(projectId) {
    // ...
    // dispatch all necessary actions here
    // this._persistenceService.loadProjectData(projectId);
  }

  saveProjectCfg(projectId, cfg: ProjectCfg) {
    this._persistenceService.saveProjectData(projectId, LS_TASK_STATE, cfg);
  }

  saveProjectData(projectId, dataKey: ProjectDataLsKey, cfg: ProjectCfg) {
    this._persistenceService.saveProjectData(projectId, dataKey, cfg);
  }

  // TODO add current type
  saveTasksForCurrentProject(taskState: any) {
    console.log('I am here!');
    console.log(this._persistenceService);

    this._persistenceService.saveProjectData(this.projectId, LS_TASK_STATE, taskState);
  }

  load() {
    // store.dispatch to update obs
  }
}
