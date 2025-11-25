import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Project } from './project.model';
import { select, Store } from '@ngrx/store';
import { nanoid } from 'nanoid';
import { Actions, ofType } from '@ngrx/effects';
import { catchError, map, shareReplay, switchMap, take } from 'rxjs/operators';
import {
  BreakNr,
  BreakNrCopy,
  BreakTime,
  BreakTimeCopy,
  WorkContextType,
} from '../work-context/work-context.model';
import { WorkContextService } from '../work-context/work-context.service';
import {
  addProject,
  archiveProject,
  moveProjectTaskToBacklogList,
  moveProjectTaskToBacklogListAuto,
  moveProjectTaskToRegularListAuto,
  unarchiveProject,
  updateProject,
  updateProjectOrder,
  upsertProject,
} from './store/project.actions';
import { TaskSharedActions } from '../../root-store/meta/task-shared.actions';
import { DEFAULT_PROJECT } from './project.const';
import {
  selectArchivedProjects,
  selectProjectById,
  selectUnarchivedProjects,
  selectUnarchivedProjectsWithoutCurrent,
} from './store/project.selectors';
import { devError } from '../../util/dev-error';
import { selectTaskFeatureState } from '../tasks/store/task.selectors';
import { getTaskById } from '../tasks/store/task.reducer.util';
import { TimeTrackingService } from '../time-tracking/time-tracking.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { sortByTitle } from '../../util/sort-by-title';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  private readonly _workContextService = inject(WorkContextService);
  private readonly _store$ = inject<Store<any>>(Store);
  private readonly _actions$ = inject(Actions);
  private readonly _timeTrackingService = inject(TimeTrackingService);

  list$: Observable<Project[]> = this._store$.pipe(select(selectUnarchivedProjects));
  list = toSignal(this.list$, { initialValue: [] });

  listSorted$: Observable<Project[]> = this.list$.pipe(
    map((projects) => sortByTitle(projects)),
  );
  listSorted = toSignal(this.listSorted$, { initialValue: [] });

  // Filtered and sorted list for UI (excludes archived and hidden projects)
  listSortedForUI$: Observable<Project[]> = this.listSorted$.pipe(
    map((projects) => projects.filter((p) => !p.isArchived && !p.isHiddenFromMenu)),
  );
  listSortedForUI = toSignal(this.listSortedForUI$, { initialValue: [] });

  archived$: Observable<Project[]> = this._store$.pipe(select(selectArchivedProjects));

  currentProject$: Observable<Project | null> =
    this._workContextService.activeWorkContextTypeAndId$.pipe(
      switchMap(({ activeId, activeType }) =>
        activeType === WorkContextType.PROJECT ? this.getByIdLive$(activeId) : of(null),
      ),
      shareReplay(1),
    );

  onMoveToBacklog$: Observable<any> = this._actions$.pipe(
    ofType(moveProjectTaskToBacklogList),
  );

  getProjectsWithoutId$(projectId: string | null): Observable<Project[]> {
    return this._store$.pipe(
      select(selectUnarchivedProjectsWithoutCurrent, { currentId: projectId }),
    );
  }

  getProjectsWithoutIdSorted$(projectId: string | null): Observable<Project[]> {
    return this.getProjectsWithoutId$(projectId).pipe(
      map((projects) => sortByTitle(projects)),
    );
  }

  getBreakNrForProject$(projectId: string): Observable<BreakNr> {
    return this._timeTrackingService.state$.pipe(
      map((current) => {
        const dataForProject = current.project[projectId];
        const breakNr: BreakNrCopy = {};
        if (dataForProject) {
          Object.keys(dataForProject).forEach((dateStr) => {
            const dateData = dataForProject[dateStr];
            if (typeof dateData?.b === 'number') {
              breakNr[dateStr] = dateData.b;
            }
          });
        }
        return breakNr;
      }),
    );

    // return this._store$.pipe(select(selectProjectBreakNrForProject, { id: projectId }));
  }

  getBreakTimeForProject$(projectId: string): Observable<BreakTime> {
    return this._timeTrackingService.state$.pipe(
      map((current) => {
        const dataForProject = current.project[projectId];
        const breakTime: BreakTimeCopy = {};
        if (dataForProject) {
          Object.keys(dataForProject).forEach((dateStr) => {
            const dateData = dataForProject[dateStr];
            if (typeof dateData?.bt === 'number') {
              breakTime[dateStr] = dateData.bt;
            }
          });
        }
        return breakTime;
      }),
    );
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

  add(project: Partial<Project>): string {
    const id = nanoid();
    this._store$.dispatch(
      addProject({
        project: {
          ...DEFAULT_PROJECT,
          ...project,
          id,
        },
      }),
    );
    return id;
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
    const allParentTaskIds = [...project.taskIds, ...project.backlogTaskIds];
    allParentTaskIds.forEach((id) => {
      const task = getTaskById(id, taskState);
      if (task.projectId && task.subTaskIds.length > 0) {
        subTaskIdsForProject.push(...task.subTaskIds);
      }
    });
    const allTaskIds = [...allParentTaskIds, ...subTaskIdsForProject];
    this._store$.dispatch(TaskSharedActions.deleteProject({ project, allTaskIds }));
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
}
