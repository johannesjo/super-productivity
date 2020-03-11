import {Injectable} from '@angular/core';
import {interval, Observable, of, Subject} from 'rxjs';
import {
  ExportedProject,
  Project,
  ProjectBasicCfg,
  ProjectThemeCfg,
} from './project.model';
import {PersistenceService} from '../../core/persistence/persistence.service';
import {select, Store} from '@ngrx/store';
import {ProjectActionTypes, UpdateProjectOrder} from './store/project.actions';
import shortid from 'shortid';
import {
  initialProjectState,
  ProjectState,
  selectAdvancedProjectCfg,
  selectArchivedProjects,
  selectCurrentProject,
  selectCurrentProjectId,
  selectIsRelatedDataLoadedForCurrentProject,
  selectProjectBasicCfg,
  selectProjectBreakNr,
  selectProjectBreakNrForDay,
  selectProjectBreakTime,
  selectProjectBreakTimeForDay,
  selectProjectById,
  selectProjectGithubCfg,
  selectProjectGithubIsEnabled,
  selectProjectJiraCfg,
  selectProjectJiraIsEnabled,
  selectProjectLastCompletedDay,
  selectProjectLastWorkEnd,
  selectProjectThemeCfg,
  selectProjectWorkEndForDay,
  selectProjectWorkStartForDay,
  selectUnarchivedProjects,
  selectUnarchivedProjectsWithoutCurrent
} from './store/project.reducer';
import {IssueIntegrationCfg, IssueProviderKey} from '../issue/issue.model';
import {JiraCfg} from '../issue/providers/jira/jira.model';
import {getWorklogStr} from '../../util/get-work-log-str';
import {GithubCfg} from '../issue/providers/github/github.model';
import {Actions, ofType} from '@ngrx/effects';
import {delayWhen, distinctUntilChanged, mapTo, shareReplay, startWith, switchMap, take} from 'rxjs/operators';
import {isValidProjectExport} from './util/is-valid-project-export';
import {SnackService} from '../../core/snack/snack.service';
import {migrateProjectState} from './migrate-projects-state.util';
import {WorklogExportSettings} from '../worklog/worklog.model';
import {T} from '../../t.const';
import {distinctUntilChangedObject} from '../../util/distinct-until-changed-object';
import {
  BreakNr,
  BreakTime,
  WorkContextAdvancedCfg,
  WorkContextAdvancedCfgKey
} from '../work-context/work-context.model';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  isRelatedDataLoadedForCurrentProject$: Observable<boolean> = this._store$.pipe(select(selectIsRelatedDataLoadedForCurrentProject));

  list$: Observable<Project[]> = this._store$.pipe(select(selectUnarchivedProjects));

  listWithoutCurrent$: Observable<Project[]> = this._store$.pipe(select(selectUnarchivedProjectsWithoutCurrent));

  archived$: Observable<Project[]> = this._store$.pipe(select(selectArchivedProjects));
  currentProject$: Observable<Project> = this._store$.pipe(
    select(selectCurrentProject),
    // filter(v => !!v),
    // TODO investigate share replay issues
    shareReplay(1),
  );
  currentTheme$: Observable<ProjectThemeCfg> = this._store$.pipe(
    select(selectProjectThemeCfg),
  );
  currentJiraCfg$: Observable<JiraCfg> = this._store$.pipe(
    select(selectProjectJiraCfg),
    shareReplay(1),
  );

  isJiraEnabled$: Observable<boolean> = this._store$.pipe(
    select(selectProjectJiraIsEnabled),
  );

  currentGithubCfg$: Observable<GithubCfg> = this._store$.pipe(
    select(selectProjectGithubCfg),
    shareReplay(1),
  );
  isGithubEnabled$: Observable<boolean> = this._store$.pipe(
    select(selectProjectGithubIsEnabled),
  );

  advancedCfg$: Observable<WorkContextAdvancedCfg> = this._store$.pipe(
    select(selectAdvancedProjectCfg),
    // shareReplay(1),
  );

  basicCfg$: Observable<ProjectBasicCfg> = this._store$.pipe(
    select(selectProjectBasicCfg),
    distinctUntilChanged(distinctUntilChangedObject),
  );

  currentId$: Observable<string> = this._store$.pipe(
    select(selectCurrentProjectId),
    distinctUntilChanged(),
  );
  currentId: string;

  onProjectChange$: Observable<any> = this._actions$.pipe(ofType(ProjectActionTypes.SetCurrentProject));

  onProjectRelatedDataLoaded$: Observable<any> = this._actions$.pipe(ofType(ProjectActionTypes.LoadProjectRelatedDataSuccess));

  breakTime$: Observable<BreakTime> = this._store$.pipe(select(selectProjectBreakTime));
  breakNr$: Observable<BreakNr> = this._store$.pipe(select(selectProjectBreakNr));

  lastWorkEnd$: Observable<number> = this._store$.pipe(select(selectProjectLastWorkEnd));

  lastCompletedDay$: Observable<string> = this._store$.pipe(select(selectProjectLastCompletedDay));

  // treated as private but needs to be assigned first
  _isProjectChanging$ = new Subject<boolean>();
  isProjectChanging$: Observable<any> = this._isProjectChanging$.pipe(
    switchMap(() => this.onProjectRelatedDataLoaded$.pipe(
      mapTo(false),
      startWith(true),
    )),
    startWith(false),
    shareReplay(1),
  );
  isProjectChangingWithDelay$: Observable<boolean> = this.isProjectChanging$.pipe(
    delayWhen(val => val
      ? of(undefined)
      : interval(60)
    )
  );


  constructor(
    private readonly _persistenceService: PersistenceService,
    private readonly _snackService: SnackService,
    // TODO correct type?
    private readonly _store$: Store<any>,
    private readonly _actions$: Actions,
  ) {
    this.currentId$.subscribe((id) => this.currentId = id);
  }

  async load() {
    const projectStateIN = await this._persistenceService.project.loadState() || initialProjectState;
    // we need to do this to migrate to the latest model if new fields are added
    const projectState = migrateProjectState({...projectStateIN});

    if (projectState) {
      if (!projectState.currentId) {
        projectState.currentId = projectState.ids[0] as string;
      }
      this.loadState(projectState);
    }
  }

  loadState(projectState: ProjectState) {
    this._store$.dispatch({
      type: ProjectActionTypes.LoadProjectState,
      payload: {state: projectState}
    });
  }

  archive(projectId: string) {
    this._store$.dispatch({
      type: ProjectActionTypes.ArchiveProject,
      payload: {id: projectId}
    });
  }

  unarchive(projectId: string) {
    this._store$.dispatch({
      type: ProjectActionTypes.UnarchiveProject,
      payload: {id: projectId}
    });
  }

  // TODO add $
  getById$(id: string): Observable<Project> {
    return this._store$.pipe(select(selectProjectById, {id}), take(1));
  }

  // TODO consistent naming
  getWorkStart$(day: string = getWorklogStr()): Observable<number> {
    return this._store$.pipe(select(selectProjectWorkStartForDay, {day}));
  }

  getWorkEnd$(day: string = getWorklogStr()): Observable<number> {
    return this._store$.pipe(select(selectProjectWorkEndForDay, {day}));
  }

  getBreakTime$(day: string = getWorklogStr()): Observable<number> {
    return this._store$.pipe(select(selectProjectBreakTimeForDay, {day}));
  }

  getBreakNr$(day: string = getWorklogStr()): Observable<number> {
    return this._store$.pipe(select(selectProjectBreakNrForDay, {day}));
  }

  add(project: Partial<Project>) {
    this._store$.dispatch({
      type: ProjectActionTypes.AddProject,
      payload: {
        project: Object.assign(project, {
          id: shortid(),
        })
      }
    });
  }

  upsert(project: Partial<Project>) {
    this._store$.dispatch({
      type: ProjectActionTypes.AddProject,
      payload: {
        project: {
          id: project.id || shortid(),
          ...project
        }
      }
    });
  }

  remove(projectId) {
    this._store$.dispatch({
      type: ProjectActionTypes.DeleteProject,
      payload: {id: projectId}
    });
  }

  update(projectId: string, changedFields: Partial<Project>) {
    this._store$.dispatch({
      type: ProjectActionTypes.UpdateProject,
      payload: {
        project: {
          id: projectId,
          changes: changedFields
        }
      }
    });
  }

  updateWorkStart(id, date: string, newVal: number) {
    this._store$.dispatch({
      type: ProjectActionTypes.UpdateProjectWorkStart,
      payload: {
        id,
        date,
        newVal,
      }
    });
  }

  updateWorkEnd(id, date: string, newVal: number) {
    this._store$.dispatch({
      type: ProjectActionTypes.UpdateProjectWorkEnd,
      payload: {
        id,
        date,
        newVal,
      }
    });
  }

  updateLastCompletedDay(id = this.currentId, date: string) {
    this._store$.dispatch({
      type: ProjectActionTypes.UpdateLastCompletedDay,
      payload: {
        id,
        date,
      }
    });
  }

  addToBreakTime(id = this.currentId, date: string = getWorklogStr(), val: number) {
    this._store$.dispatch({
      type: ProjectActionTypes.AddToProjectBreakTime,
      payload: {
        id,
        date,
        val,
      }
    });
  }

  updateAdvancedCfg(projectId: string, sectionKey: WorkContextAdvancedCfgKey, data: any) {
    this._store$.dispatch({
      type: ProjectActionTypes.UpdateProjectAdvancedCfg,
      payload: {
        projectId,
        sectionKey,
        data,
      }
    });
  }

  updateIssueProviderConfig(
    projectId: string,
    issueProviderKey: IssueProviderKey,
    providerCfg: Partial<IssueIntegrationCfg>,
    isOverwrite = false
  ) {
    this._store$.dispatch({
      type: ProjectActionTypes.UpdateProjectIssueProviderCfg,
      payload: {
        projectId,
        issueProviderKey,
        providerCfg,
        isOverwrite
      }
    });
  }

  setCurrentId(projectId: string) {
    if (this.currentId === projectId) {
      return;
    }

    this._isProjectChanging$.next(true);
    this._store$.dispatch({
      type: ProjectActionTypes.SetCurrentProject,
      payload: projectId,
    });
  }

  updateOrder(ids: string[]) {
    this._store$.dispatch(new UpdateProjectOrder({ids}));
  }

  // DB INTERFACE
  async importCompleteProject(data: ExportedProject): Promise<any> {
    console.log(data);
    const {relatedModels, ...project} = data;
    if (isValidProjectExport(data)) {
      const state = await this._persistenceService.project.loadState();
      if (state.entities[project.id]) {
        this._snackService.open({
          type: 'ERROR',
          msg: T.F.PROJECT.S.E_EXISTS,
          translateParams: {title: project.title}
        });
      } else {
        await this._persistenceService.restoreCompleteRelatedDataForProject(project.id, relatedModels);
        this.upsert(project);
      }
    } else {
      this._snackService.open({type: 'ERROR', msg: T.F.PROJECT.S.E_INVALID_FILE});
    }
  }

  updateWorklogExportSettings(projectId: string, data: WorklogExportSettings) {
    this.updateAdvancedCfg(projectId, 'worklogExportSettings', {
      ...data,
    });
  }
}
