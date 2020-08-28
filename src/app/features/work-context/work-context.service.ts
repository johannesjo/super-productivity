import { Injectable } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { combineLatest, EMPTY, interval, Observable, of, timer } from 'rxjs';
import {
  WorkContext,
  WorkContextAdvancedCfg,
  WorkContextAdvancedCfgKey,
  WorkContextState,
  WorkContextThemeCfg,
  WorkContextType
} from './work-context.model';
import { setActiveWorkContext } from './store/work-context.actions';
import { selectActiveContextId, selectActiveContextTypeAndId } from './store/work-context.reducer';
import { NavigationEnd, Router } from '@angular/router';
import {
  concatMap,
  delayWhen,
  distinctUntilChanged,
  filter,
  first,
  map,
  mapTo,
  shareReplay,
  startWith,
  switchMap,
  take,
  withLatestFrom
} from 'rxjs/operators';
import { TODAY_TAG } from '../tag/tag.const';
import { TagService } from '../tag/tag.service';
import { Task, TaskWithSubTasks } from '../tasks/task.model';
import { distinctUntilChangedObject } from '../../util/distinct-until-changed-object';
import { getWorklogStr } from '../../util/get-work-log-str';
import { hasTasksToWorkOn, mapEstimateRemainingFromTasks } from './work-context.util';
import { flattenTasks, selectTaskEntities, selectTasksWithSubTasksByIds } from '../tasks/store/task.selectors';
import { Actions, ofType } from '@ngrx/effects';
import { moveTaskToBacklogList } from './store/work-context-meta.actions';
import { selectProjectById } from '../project/store/project.reducer';
import { WorklogExportSettings } from '../worklog/worklog.model';
import {
  AddToProjectBreakTime,
  UpdateProjectAdvancedCfg,
  UpdateProjectWorkEnd,
  UpdateProjectWorkStart
} from '../project/store/project.actions';
import {
  addToBreakTimeForTag,
  updateAdvancedConfigForTag,
  updateWorkEndForTag,
  updateWorkStartForTag
} from '../tag/store/tag.actions';
import { allDataWasLoaded } from '../../root-store/meta/all-data-was-loaded.actions';
import { isToday } from '../../util/is-today.util';

@Injectable({
  providedIn: 'root',
})
export class WorkContextService {
  // here because to avoid circular dependencies
  // should be treated as private
  _isAllDataLoaded$: Observable<boolean> = this._actions$.pipe(
    ofType(allDataWasLoaded),
    mapTo(true),
    startWith(false),
    shareReplay(1),
  );

  // CONTEXT LEVEL
  // -------------
  activeWorkContextId$: Observable<string | null> = this._store$.pipe(
    select(selectActiveContextId),
    distinctUntilChanged(),
    shareReplay(1),
  );
  // activeWorkContextType$: Observable<WorkContextType> = this._store$.pipe(select(selectActiveContextType));

  activeWorkContextTypeAndId$: Observable<{
    activeId: string;
    activeType: WorkContextType;
  }> = this._store$.pipe(
    select(selectActiveContextTypeAndId),
    distinctUntilChanged(distinctUntilChangedObject),
    shareReplay(1),
  );
  isActiveWorkContextProject$: Observable<boolean> = this.activeWorkContextTypeAndId$.pipe(
    map(({activeType}) => activeType === WorkContextType.PROJECT),
    shareReplay(1),
  );

  isActiveWorkContextTodayList$: Observable<boolean> = this.activeWorkContextId$.pipe(
    map((id) => id === TODAY_TAG.id),
    shareReplay(1),
  );

  activeWorkContextIdIfProject$: Observable<string> = this.activeWorkContextTypeAndId$.pipe(
    map(({activeType, activeId}) => {
      if (activeType !== WorkContextType.PROJECT) {
        throw Error('Not in project context');
      }
      return activeId;
    })
  );

  // for convenience...
  activeWorkContextId?: string;
  activeWorkContextType?: WorkContextType;

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
      // return nothing until defined
      return EMPTY;
    }),
    // TODO find out why this is sometimes undefined
    filter(ctx => !!ctx),
    shareReplay(1),
  );

  activeWorkContextOnceOnContextChange$: Observable<WorkContext> = this.activeWorkContextId$.pipe(
    switchMap(() => this.activeWorkContext$.pipe(first())),
  );

  mainWorkContexts$: Observable<WorkContext[]> =
    this._isAllDataLoaded$.pipe(
      concatMap(() => this._tagService.getTagById$(TODAY_TAG.id)),
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

  advancedCfg$: Observable<WorkContextAdvancedCfg> = this.activeWorkContext$.pipe(
    map(awc => awc.advancedCfg)
  );

  onWorkContextChange$: Observable<any> = this._actions$.pipe(ofType(setActiveWorkContext));
  isContextChanging$: Observable<boolean> = this.onWorkContextChange$.pipe(
    switchMap(() =>
      timer(50).pipe(
        mapTo(false),
        startWith(true)
      )
    ),
    startWith(false),
  );
  isContextChangingWithDelay$: Observable<boolean> = this.isContextChanging$.pipe(
    delayWhen(val => val
      ? of(undefined)
      : interval(60)
    )
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
    // tap(() => console.log('TRIGGER TODAY TASKS')),
    switchMap(taskIds => this._getTasksByIds$(taskIds)),
    // TODO find out why this is triggered so often
    // tap(() => console.log('AFTER SWITCHMAP  TODAYSTASKS')),
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

  allTasksForCurrentContext$: Observable<TaskWithSubTasks[]> = combineLatest([
    this.todaysTasks$,
    this.backlogTasks$,
  ]).pipe(
    map(([today, backlog]) => [...today, ...backlog])
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
        (Object.keys(entities)
          .filter((id) => {
            const t = entities[id] as Task;
            return !t.isDone && (
              (t.parentId)
                ? (taskIds.includes(t.parentId))
                : (taskIds.includes(id) && (!t.subTaskIds || t.subTaskIds.length === 0))
            );
          })
          .map(key => entities[key]) as Task[])
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

  allNonArchiveTasks$: Observable<TaskWithSubTasks[]> = combineLatest([
    this.todaysTasks$,
    this.backlogTasks$
  ]).pipe(
    map(([today, backlog]) => ([
      ...today,
      ...backlog
    ]))
  );

  flatDoneTodayPercent$: Observable<number> = this.todaysTasks$.pipe(
    map(tasks => flattenTasks(tasks)),
    map(tasks => {
      const done = tasks.filter(task => task.isDone);
      return done.length / tasks.length;
    })
  );

  allRepeatableTasksFlat$: Observable<TaskWithSubTasks[]> = this.allNonArchiveTasks$.pipe(
    map((tasks) => (tasks.filter(task => !!task.repeatCfgId))),
    map(tasks => flattenTasks(tasks)),
  );

  isToday: boolean = false;
  isToday$: Observable<boolean> = this.activeWorkContextId$.pipe(
    map(id => id === TODAY_TAG.id),
    shareReplay(1),
  );

  constructor(
    private _store$: Store<WorkContextState>,
    private _actions$: Actions,
    private _tagService: TagService,
    private _router: Router,
  ) {
    this.isToday$.subscribe((v) => this.isToday = v);

    this.activeWorkContextTypeAndId$.subscribe(v => {
      this.activeWorkContextId = v.activeId;
      this.activeWorkContextType = v.activeType;
    });

    // we need all data to be loaded before we dispatch a setActiveContext action
    this._router.events.pipe(
      // NOTE: when we use any other router event than NavigationEnd, the changes triggered
      // by the active context may occur before the current page component is unloaded
      filter(event => event instanceof NavigationEnd),
      withLatestFrom(this._isAllDataLoaded$),
      concatMap(([next, isAllDataLoaded]) => isAllDataLoaded
        ? of(next as NavigationEnd)
        : this._isAllDataLoaded$.pipe(
          filter(isLoaded => isLoaded),
          take(1),
          mapTo(next as NavigationEnd),
        )
      ),
    ).subscribe(({urlAfterRedirects}: NavigationEnd) => {
        const split = urlAfterRedirects.split('/');
        const id = split[2];

        // prevent issue when setActiveContext is called directly
        if (this.activeWorkContextId === id) {
          return;
        }

        if (urlAfterRedirects.match(/tag\/.+/)) {
          this._setActiveContext(id, WorkContextType.TAG);
        } else if (urlAfterRedirects.match(/project\/.+/)) {
          this._setActiveContext(id, WorkContextType.PROJECT);
        }
      }
    );
  }

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

  getDailySummaryTasksFlat$(dayStr: string): Observable<Task[]> {
    return combineLatest([
      this.allRepeatableTasksFlat$,
      this._getDailySummaryTasksFlatWithoutRepeatable$(dayStr)
    ]).pipe(
      map(([repeatableTasks, workedOnOrDoneTasks]) => [
        ...repeatableTasks,
        // NOTE: remove double tasks
        ...workedOnOrDoneTasks.filter(
          (task => !task.repeatCfgId)
        ),
      ]),
    );
  }

  getWorkStart$(day: string = getWorklogStr()): Observable<number> {
    return this.activeWorkContext$.pipe(
      map(ctx => ctx.workStart[day]),
    );
  }

  getWorkEnd$(day: string = getWorklogStr()): Observable<number> {
    return this.activeWorkContext$.pipe(
      map(ctx => ctx.workEnd[day]),
    );
  }

  getBreakTime$(day: string = getWorklogStr()): Observable<number> {
    return this.activeWorkContext$.pipe(
      map(ctx => ctx.breakTime[day]),
    );
  }

  getBreakNr$(day: string = getWorklogStr()): Observable<number> {
    return this.activeWorkContext$.pipe(
      map(ctx => ctx.breakNr[day]),
    );
  }

  async load() {
    // NOTE: currently route has prevalence over everything else and as there is not state apart from
    // activeContextId, and activeContextType, we don't need to load it
    // const state = await this._persistenceService.context.loadState() || initialContextState;
    // this._store$.dispatch(loadWorkContextState({state}));
  }

  updateWorklogExportSettingsForCurrentContext(data: WorklogExportSettings) {
    this._updateAdvancedCfgForCurrentContext('worklogExportSettings', {
      ...data,
    });
  }

  updateWorkStartForActiveContext(date: string, newVal: number) {
    const payload: { id: string; date: string; newVal: number; } = {
      id: this.activeWorkContextId as string,
      date,
      newVal,
    };
    const action = (this.activeWorkContextType === WorkContextType.PROJECT)
      ? new UpdateProjectWorkStart(payload)
      : updateWorkStartForTag(payload);
    this._store$.dispatch(action);
  }

  updateWorkEndForActiveContext(date: string, newVal: number) {
    const payload: { id: string; date: string; newVal: number; } = {
      id: this.activeWorkContextId as string,
      date,
      newVal,
    };
    const action = (this.activeWorkContextType === WorkContextType.PROJECT)
      ? new UpdateProjectWorkEnd(payload)
      : updateWorkEndForTag(payload);
    this._store$.dispatch(action);
  }

  addToBreakTimeForActiveContext(date: string = getWorklogStr(), valToAdd: number) {
    const payload: { id: string; date: string; valToAdd: number; } = {
      id: this.activeWorkContextId as string,
      date,
      valToAdd,
    };
    const action = (this.activeWorkContextType === WorkContextType.PROJECT)
      ? new AddToProjectBreakTime(payload)
      : addToBreakTimeForTag(payload);
    this._store$.dispatch(action);
  }

  private _updateAdvancedCfgForCurrentContext(sectionKey: WorkContextAdvancedCfgKey, data: any) {
    if (this.activeWorkContextType === WorkContextType.PROJECT) {
      this._store$.dispatch(new UpdateProjectAdvancedCfg({
        projectId: this.activeWorkContextId as string,
        sectionKey,
        data,
      }));
    } else if (this.activeWorkContextType === WorkContextType.TAG) {
      this._store$.dispatch(updateAdvancedConfigForTag({
        tagId: this.activeWorkContextId as string,
        sectionKey,
        data
      }));
    }
  }

  // we don't want a circular dependency that's why we do it here...
  private _getTasksByIds$(ids: string[]): Observable<TaskWithSubTasks[]> {
    if (!Array.isArray(ids)) {
      throw new Error('Invalid param provided for getByIds$ :(');
    }
    return this._store$.pipe(select(selectTasksWithSubTasksByIds, {ids}));
  }

  // NOTE: NEVER call this from some place other than the route change stuff
  private async _setActiveContext(activeId: string, activeType: WorkContextType) {
    this._store$.dispatch(setActiveWorkContext({activeId, activeType}));
  }

  private _getDailySummaryTasksFlatWithoutRepeatable$(dayStr: string): Observable<Task[]> {
    const _isWorkedOnOrDoneToday = (t: Task) => (t.timeSpentOnDay && t.timeSpentOnDay[dayStr] && t.timeSpentOnDay[dayStr] > 0)
      || (t.isDone && (!t.doneOn || isToday((t.doneOn))));

    return this.allNonArchiveTasks$.pipe(
      map(tasks => {
        let flatTasks: Task[] = [];
        tasks.forEach(pt => {
          if (pt.subTasks && pt.subTasks.length) {
            const subTasks = pt.subTasks.filter(st => _isWorkedOnOrDoneToday(st));
            if (subTasks.length) {
              flatTasks.push(pt);
              flatTasks = flatTasks.concat(subTasks);
            }
          } else if (_isWorkedOnOrDoneToday(pt)) {
            flatTasks.push(pt);
          }
        });
        return flatTasks;
      }),
    );
  }
}
