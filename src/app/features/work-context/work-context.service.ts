import {Injectable} from '@angular/core';
import {select, Store} from '@ngrx/store';
import {combineLatest, EMPTY, Observable, of} from 'rxjs';
import {WorkContext, WorkContextState, WorkContextThemeCfg, WorkContextType} from './work-context.model';
import {PersistenceService} from '../../core/persistence/persistence.service';
import {loadWorkContextState, setActiveWorkContext} from './store/work-context.actions';
import {initialContextState, selectActiveContextId, selectActiveContextTypeAndId} from './store/work-context.reducer';
import {NavigationStart, Router, RouterEvent} from '@angular/router';
import {distinctUntilChanged, filter, map, shareReplay, switchMap} from 'rxjs/operators';
import {TaskService} from '../tasks/task.service';
import {MY_DAY_TAG} from '../tag/tag.const';
import {TagService} from '../tag/tag.service';
import {Task, TaskWithSubTasks} from '../tasks/task.model';
import {ProjectService} from '../project/project.service';
import {distinctUntilChangedObject} from '../../util/distinct-until-changed-object';
import {getWorklogStr} from '../../util/get-work-log-str';
import {mapEstimateRemainingFromTasks} from './work-context.util';

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
        return this._projectService.getByIdLive$(activeId).pipe(
          // TODO find out why this is sometimes undefined
          filter(p => !!p),
          map(project => ({
            ...project,
            icon: null,
            taskIds: project.todaysTaskIds || [],
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
  // only todays list
  todaysTasks$: Observable<TaskWithSubTasks[]> = this.activeWorkContext$.pipe(
    switchMap(activeWorkContext => this._taskService.getByIds$(activeWorkContext.taskIds)),
    shareReplay(1),
  );

  undoneTasks$: Observable<TaskWithSubTasks[]> = this.todaysTasks$.pipe(
    map(tasks => tasks.filter(task => task && !task.isDone))
  );

  doneTasks$: Observable<TaskWithSubTasks[]> = this.todaysTasks$.pipe(
    map(tasks => tasks.filter(task => task && task.isDone))
  );

  backlogTasks$: Observable<TaskWithSubTasks[]> = this.activeWorkContext$.pipe(
    switchMap(activeWorkContext => (activeWorkContext.backlogTaskIds && activeWorkContext.backlogTaskIds.length)
      ? this._taskService.getByIds$(activeWorkContext.backlogTaskIds)
      : of([])
    ),
    map(tasks => tasks.filter(task => task && task.isDone))
  );

  // TODO make it more efficient
  startableTasks$: Observable<Task[]> = combineLatest([
    this.activeWorkContext$,
    this._taskService.taskEntityState$
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

  backlogTasksCount$: Observable<number> = this.backlogTasks$.pipe(map(tasks => tasks.length));

  workingToday$: Observable<any> = this.getTimeWorkedForDay$(getWorklogStr());

  // TODO fix
  onMoveToBacklog$: Observable<any> = EMPTY;
  // this._actions$.pipe(ofType(
  // TaskActionTypes.MoveToBacklog,
  // ));

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
    private _taskService: TaskService,
    private _projectService: ProjectService,
    private _tagService: TagService,
    private _router: Router,
  ) {
    this._router.events.pipe(
      filter(event => event instanceof NavigationStart),
    ).subscribe(({url}: RouterEvent) => {
        const split = url.split('/');
        const id = split[2];

        if (url.match(/tag\/.+/)) {
          this.setActiveContext(id, WorkContextType.TAG);
        } else if (url.match(/project\/.+/)) {
          this.setActiveContext(id, WorkContextType.PROJECT);
        }
      }
    );
  }

  async load() {
    const state = await this._persistenceService.context.loadState() || initialContextState;
    this._store$.dispatch(loadWorkContextState({state}));
  }

  setActiveContext(activeId: string, activeType: WorkContextType) {
    this._store$.dispatch(setActiveWorkContext({activeId, activeType}));
  }
}
