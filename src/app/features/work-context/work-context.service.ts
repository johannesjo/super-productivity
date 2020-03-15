import {Injectable} from '@angular/core';
import {select, Store} from '@ngrx/store';
import {combineLatest, EMPTY, Observable, of} from 'rxjs';
import {WorkContext, WorkContextState, WorkContextThemeCfg, WorkContextType} from './work-context.model';
import {PersistenceService} from '../../core/persistence/persistence.service';
import {loadWorkContextState, setActiveWorkContext} from './store/work-context.actions';
import {initialContextState, selectActiveContextId, selectActiveContextTypeAndId} from './store/work-context.reducer';
import {NavigationStart, Router, RouterEvent} from '@angular/router';
import {distinctUntilChanged, filter, map, shareReplay, switchMap} from 'rxjs/operators';
import {MY_DAY_TAG} from '../tag/tag.const';
import {TagService} from '../tag/tag.service';
import {Task, TaskWithSubTasks} from '../tasks/task.model';
import {distinctUntilChangedObject} from '../../util/distinct-until-changed-object';
import {getWorklogStr} from '../../util/get-work-log-str';
import {hasTasksToWorkOn, mapEstimateRemainingFromTasks} from './work-context.util';
import {selectTaskEntities, selectTasksWithSubTasksByIds} from '../tasks/store/task.selectors';
import {Actions, ofType} from '@ngrx/effects';
import {moveTaskToBacklogList} from './store/work-context-meta.actions';
import {selectProjectById} from '../project/store/project.reducer';

@Injectable({
  providedIn: 'root',
})
export class WorkContextService {
  // CONTEXT LEVEL
  // -------------
  activeWorkContextId$ = this._store$.pipe(select(selectActiveContextId));
  activeWorkContextTypeAndId$ = this._store$.pipe(
    select(selectActiveContextTypeAndId),
    distinctUntilChanged(distinctUntilChangedObject)
  );

  // for convenience...
  activeWorkContextId: string;
  activeWorkContextType: WorkContextType;

  activeWorkContext$: Observable<WorkContext> = this.activeWorkContextTypeAndId$.pipe(
    switchMap(({activeId, activeType}) => {
      if (activeType === WorkContextType.TAG) {
        return this._tagService.getTagById$(activeId).pipe(
          // TODO find out why this is sometimes undefined
          filter(p => !!p),
          map(tag => ({
            ...tag,
            type: WorkContextType.TAG,
            routerLink: `tag/${tag.id}`
          }))
        );
      }
      if (activeType === WorkContextType.PROJECT) {
        // return this._projectService.getByIdLive$(activeId).pipe(
        // NOTE: temporary work around to be able to sync current id
        return this._store$.pipe(select(selectProjectById, {id: activeId})).pipe(
          // TODO find out why this is sometimes undefined
          filter(p => !!p),
          map(project => ({
            ...project,
            icon: null,
            taskIds: project.taskIds || [],
            backlogTaskIds: project.backlogTaskIds || [],
            type: WorkContextType.PROJECT,
            routerLink: `project/${project.id}`
          })),
        );
      }
      return EMPTY;
    }),
    // TODO find out why this is sometimes undefined
    filter(ctx => !!ctx),
  );

  mainWorkContexts$: Observable<WorkContext[]> =
    this._tagService.getTagById$(MY_DAY_TAG.id).pipe(
      switchMap(myDayTag => of([
          ({
            ...myDayTag,
            type: WorkContextType.TAG,
            routerLink: `tag/${myDayTag.id}`
          } as WorkContext)
        ])
      ),
    );

  currentTheme$: Observable<WorkContextThemeCfg> = this.activeWorkContext$.pipe(
    map(awc => awc.theme)
  );

  // TASK LEVEL
  // ----------
  todaysTaskIds$: Observable<string[]> = this.activeWorkContext$.pipe(
    map((ac) => ac.taskIds),
    distinctUntilChanged(distinctUntilChangedObject),
    shareReplay(1),
  );

  backlogTaskIds$: Observable<string[]> = this.activeWorkContext$.pipe(
    map((ac) => ac.backlogTaskIds || []),
    distinctUntilChanged(distinctUntilChangedObject),
    shareReplay(1),
  );

  todaysTasks$: Observable<TaskWithSubTasks[]> = this.todaysTaskIds$.pipe(
    switchMap(taskIds => this._getTasksByIds$(taskIds)),
    // map(to => to.filter(t => !!t)),
    shareReplay(1),
  );

  undoneTasks$: Observable<TaskWithSubTasks[]> = this.todaysTasks$.pipe(
    map(tasks => tasks.filter(task => task && !task.isDone)),
  );

  doneTasks$: Observable<TaskWithSubTasks[]> = this.todaysTasks$.pipe(
    map(tasks => tasks.filter(task => task && task.isDone))
  );

  backlogTasks$: Observable<TaskWithSubTasks[]> = this.backlogTaskIds$.pipe(
    switchMap(ids => this._getTasksByIds$(ids)),
  );

  // TODO make it more efficient
  startableTasks$: Observable<Task[]> = combineLatest([
    this.activeWorkContext$,
    this._store$.pipe(
      select(selectTaskEntities),
    )
  ]).pipe(
    switchMap(([activeContext, entities]) => {
      const taskIds = activeContext.taskIds;
      return of(
        Object.keys(entities)
          .filter((id) => {
            const t = entities[id];
            return !t.isDone && (
              (t.parentId)
                ? (taskIds.includes(t.parentId))
                : (taskIds.includes(id) && (!t.subTaskIds || t.subTaskIds.length === 0))
            );
          })
          .map(key => entities[key])
      );
    })
  );

  workingToday$: Observable<any> = this.getTimeWorkedForDay$(getWorklogStr());

  onMoveToBacklog$: Observable<any> = this._actions$.pipe(ofType(
    moveTaskToBacklogList,
  ));

  isHasTasksToWorkOn$: Observable<boolean> = this.todaysTasks$.pipe(
    map(hasTasksToWorkOn),
    distinctUntilChanged(),
  );

  estimateRemainingToday$: Observable<number> = this.todaysTasks$.pipe(
    map(mapEstimateRemainingFromTasks),
    distinctUntilChanged(),
  );

  // TODO could be done better
  getTimeWorkedForDay$(day: string = getWorklogStr()): Observable<number> {
    return this.todaysTasks$.pipe(
      map((tasks) => {
        return tasks && tasks.length && tasks.reduce((acc, task) => {
            return acc + (
              (task.timeSpentOnDay && +task.timeSpentOnDay[day])
                ? +task.timeSpentOnDay[day]
                : 0
            );
          }, 0
        );
      }),
      distinctUntilChanged(),
    );
  }

  // TODO could be done better
  getTimeEstimateForDay$(day: string = getWorklogStr()): Observable<number> {
    return this.todaysTasks$.pipe(
      map((tasks) => {
        return tasks && tasks.length && tasks.reduce((acc, task) => {
            if (!task.timeSpentOnDay && !(task.timeSpentOnDay[day] > 0)) {
              return acc;
            }
            const remainingEstimate = task.timeEstimate + (task.timeSpentOnDay[day]) - task.timeSpent;
            return (remainingEstimate > 0)
              ? acc + remainingEstimate
              : acc;
          }, 0
        );
      }),
      distinctUntilChanged(),
    );
  }

  constructor(
    private _store$: Store<WorkContextState>,
    private _persistenceService: PersistenceService,
    private _actions$: Actions,
    private _tagService: TagService,
    private _router: Router,
  ) {
    this.activeWorkContextTypeAndId$.subscribe(v => {
      this.activeWorkContextId = v.activeId;
      this.activeWorkContextType = v.activeType;
    });

    this._router.events.pipe(
      filter(event => event instanceof NavigationStart),
    ).subscribe(({url}: RouterEvent) => {
        const split = url.split('/');
        const id = split[2];

        if (url.match(/tag\/.+/)) {
          this._setActiveContext(id, WorkContextType.TAG);
        } else if (url.match(/project\/.+/)) {
          this._setActiveContext(id, WorkContextType.PROJECT);
        }
      }
    );
  }

  async load() {
    const state = await this._persistenceService.context.loadState() || initialContextState;
    this._store$.dispatch(loadWorkContextState({state}));
  }

  private _setActiveContext(activeId: string, activeType: WorkContextType) {
    this._store$.dispatch(setActiveWorkContext({activeId, activeType}));
  }

  // we don't want a circular dependency that's why we do it here...
  private _getTasksByIds$(ids: string[]): Observable<TaskWithSubTasks[]> {
    if (!Array.isArray(ids)) {
      throw new Error('Invalid param provided for getByIds$ :(');
    }
    return this._store$.pipe(select(selectTasksWithSubTasksByIds, {ids}));
  }
}
