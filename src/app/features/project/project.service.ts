import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Project } from './project.model';
import { PersistenceService } from '../../core/persistence/persistence.service';
import { select, Store } from '@ngrx/store';
import { nanoid } from 'nanoid';
import { Actions, ofType } from '@ngrx/effects';
import { catchError, map, shareReplay, switchMap, take } from 'rxjs/operators';
import { isValidProjectExport } from './util/is-valid-project-export';
import { SnackService } from '../../core/snack/snack.service';
import { T } from '../../t.const';
import { BreakNr, BreakTime, WorkContextType } from '../work-context/work-context.model';
import { WorkContextService } from '../work-context/work-context.service';
import { ExportedProject } from './project-archive.model';
import {
  addProject,
  archiveProject,
  deleteProject,
  loadProjectRelatedDataSuccess,
  moveProjectTaskToBacklogList,
  moveProjectTaskToBacklogListAuto,
  moveProjectTaskToRegularListAuto,
  toggleHideFromMenu,
  unarchiveProject,
  updateProject,
  updateProjectOrder,
  upsertProject,
} from './store/project.actions';
import { DEFAULT_PROJECT } from './project.const';
import {
  selectArchivedProjects,
  selectProjectBreakNrForProject,
  selectProjectBreakTimeForProject,
  selectProjectById,
  selectUnarchivedProjects,
  selectUnarchivedProjectsWithoutCurrent,
} from './store/project.selectors';
import { devError } from '../../util/dev-error';
import { selectTaskFeatureState } from '../tasks/store/task.selectors';
import { getTaskById } from '../tasks/store/task.reducer.util';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  private readonly _persistenceService = inject(PersistenceService);
  private readonly _snackService = inject(SnackService);
  private readonly _workContextService = inject(WorkContextService);
  private readonly _store$ = inject<Store<any>>(Store);
  private readonly _actions$ = inject(Actions);

  list$: Observable<Project[]> = this._store$.pipe(select(selectUnarchivedProjects));

  archived$: Observable<Project[]> = this._store$.pipe(select(selectArchivedProjects));

  currentProject$: Observable<Project | null> =
    this._workContextService.activeWorkContextTypeAndId$.pipe(
      switchMap(({ activeId, activeType }) =>
        activeType === WorkContextType.PROJECT ? this.getByIdLive$(activeId) : of(null),
      ),
      shareReplay(1),
    );

  /* @deprecated  todo fix */
  isRelatedDataLoadedForCurrentProject$: Observable<boolean> =
    this._workContextService.isActiveWorkContextProject$.pipe(
      switchMap((isProject) =>
        isProject
          ? this._workContextService.activeWorkContextIdIfProject$.pipe(
              switchMap((activeId) =>
                this._actions$.pipe(
                  ofType(loadProjectRelatedDataSuccess.type),
                  map(({ payload: { projectId } }) => projectId === activeId),
                ),
              ),
            )
          : of(false),
      ),
    );

  onMoveToBacklog$: Observable<any> = this._actions$.pipe(
    ofType(moveProjectTaskToBacklogList),
  );

  getProjectsWithoutId$(projectId: string | null): Observable<Project[]> {
    return this._store$.pipe(
      select(selectUnarchivedProjectsWithoutCurrent, { currentId: projectId }),
    );
  }

  getBreakNrForProject$(projectId: string): Observable<BreakNr> {
    return this._store$.pipe(select(selectProjectBreakNrForProject, { id: projectId }));
  }

  getBreakTimeForProject$(projectId: string): Observable<BreakTime> {
    return this._store$.pipe(select(selectProjectBreakTimeForProject, { id: projectId }));
  }

  archive(projectId: string): void {
    this._store$.dispatch(archiveProject({ id: projectId }));
  }

  unarchive(projectId: string): void {
    this._store$.dispatch(unarchiveProject({ id: projectId }));
  }

  getByIdOnce$(id: string): Observable<Project> {
    if (!id) {
      throw new Error('No id given');
    }
    return this._store$.pipe(select(selectProjectById, { id }), take(1));
  }

  getByIdOnceCatchError$(id: string): Observable<Project | null> {
    if (!id) {
      throw new Error('No id given');
    }
    return this._store$.pipe(
      select(selectProjectById, { id }),
      take(1),
      catchError((err) => {
        devError(err);
        return of(null);
      }),
    );
  }

  getByIdLive$(id: string): Observable<Project> {
    if (!id) {
      throw new Error('No id given');
    }
    return this._store$.pipe(select(selectProjectById, { id }));
  }

  add(project: Partial<Project>): void {
    this._store$.dispatch(
      addProject({
        project: {
          ...DEFAULT_PROJECT,
          ...project,
          id: nanoid(),
        },
      }),
    );
  }

  upsert(project: Partial<Project>): void {
    this._store$.dispatch(
      upsertProject({
        project: {
          ...project,
          id: project.id || nanoid(),
        } as Project,
      }),
    );
  }

  async remove(project: Project): Promise<void> {
    const taskState = await this._store$
      .select(selectTaskFeatureState)
      .pipe(take(1))
      .toPromise();
    const subTaskIdsForProject: string[] = [];
    project.taskIds.forEach((id) => {
      const task = getTaskById(id, taskState);
      if (task.projectId && task.subTaskIds.length > 0) {
        subTaskIdsForProject.push(...task.subTaskIds);
      }
    });
    const allTaskIds = [
      ...project.taskIds,
      ...project.backlogTaskIds,
      ...subTaskIdsForProject,
    ];
    this._store$.dispatch(deleteProject({ project, allTaskIds }));
  }

  toggleHideFromMenu(projectId: string): void {
    this._store$.dispatch(toggleHideFromMenu({ id: projectId }));
  }

  update(projectId: string, changedFields: Partial<Project>): void {
    this._store$.dispatch(
      updateProject({
        project: {
          id: projectId,
          changes: changedFields,
        },
      }),
    );
  }

  moveTaskToTodayList(id: string, projectId: string, isMoveToTop: boolean = false): void {
    this._store$.dispatch(
      moveProjectTaskToRegularListAuto({
        taskId: id,
        isMoveToTop,
        projectId,
      }),
    );
  }

  moveTaskToBacklog(taskId: string, projectId: string): void {
    this._store$.dispatch(moveProjectTaskToBacklogListAuto({ taskId, projectId }));
  }

  updateOrder(ids: string[]): void {
    this._store$.dispatch(updateProjectOrder({ ids }));
  }

  // DB INTERFACE
  async importCompleteProject(data: ExportedProject): Promise<any> {
    console.log(data);
    const { relatedModels, ...project } = data;
    if (isValidProjectExport(data)) {
      const state = await this._persistenceService.project.loadState();
      if (state.entities[project.id]) {
        this._snackService.open({
          type: 'ERROR',
          msg: T.F.PROJECT.S.E_EXISTS,
          translateParams: { title: project.title },
        });
      } else {
        await this._persistenceService.restoreCompleteRelatedDataForProject(
          project.id,
          relatedModels,
        );
        this.upsert(project);
      }
    } else {
      this._snackService.open({ type: 'ERROR', msg: T.F.PROJECT.S.E_INVALID_FILE });
    }
  }
}
