import { Injectable, inject } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { combineLatest, interval, Observable, of, timer } from 'rxjs';
import {
  WorkContext,
  WorkContextAdvancedCfg,
  WorkContextAdvancedCfgKey,
  WorkContextState,
  WorkContextThemeCfg,
  WorkContextType,
} from './work-context.model';
import { setActiveWorkContext } from './store/work-context.actions';
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
  withLatestFrom,
} from 'rxjs/operators';
import { TODAY_TAG } from '../tag/tag.const';
import { TagService } from '../tag/tag.service';
import { ArchiveTask, Task, TaskWithSubTasks } from '../tasks/task.model';
import { hasTasksToWorkOn, mapEstimateRemainingFromTasks } from './work-context.util';
import {
  flattenTasks,
  selectAllTasks,
  selectTasksWithSubTasksByIds,
} from '../tasks/store/task.selectors';
import { Actions, ofType } from '@ngrx/effects';
import { WorklogExportSettings } from '../worklog/worklog.model';
import {
  addToProjectBreakTime,
  updateProjectAdvancedCfg,
  updateProjectWorkEnd,
  updateProjectWorkStart,
} from '../project/store/project.actions';
import {
  addToBreakTimeForTag,
  updateAdvancedConfigForTag,
  updateWorkEndForTag,
  updateWorkStartForTag,
} from '../tag/store/tag.actions';
import { allDataWasLoaded } from '../../root-store/meta/all-data-was-loaded.actions';
import {
  selectActiveContextId,
  selectActiveContextTypeAndId,
  selectActiveWorkContext,
  selectDoneBacklogTaskIdsForActiveContext,
  selectDoneTaskIdsForActiveContext,
  selectStartableTasksForActiveContext,
  selectTrackableTasksForActiveContext,
} from './store/work-context.selectors';
import { GlobalTrackingIntervalService } from '../../core/global-tracking-interval/global-tracking-interval.service';
import { Note } from '../note/note.model';
import { selectNotesById } from '../note/store/note.reducer';
import { TranslateService } from '@ngx-translate/core';
import { T } from '../../t.const';
import { distinctUntilChangedSimpleArray } from '../../util/distinct-until-changed-simple-array';
import { isShallowEqual } from '../../util/is-shallow-equal';
import { distinctUntilChangedObject } from '../../util/distinct-until-changed-object';
import { DateService } from 'src/app/core/date/date.service';
import { getTimeSpentForDay } from './get-time-spent-for-day.util';
import { PersistenceService } from '../../core/persistence/persistence.service';

@Injectable({
  providedIn: 'root',
})
export class WorkContextService {
  private _store$ = inject<Store<WorkContextState>>(Store);
  private _actions$ = inject(Actions);
  private _tagService = inject(TagService);
  private _globalTrackingIntervalService = inject(GlobalTrackingIntervalService);
  private _dateService = inject(DateService);
  private _router = inject(Router);
  private _translateService = inject(TranslateService);
  private _persistenceService = inject(PersistenceService);

  // here because to avoid circular dependencies
  // should be treated as private
  _isAllDataLoaded$: Observable<boolean> = this._actions$.pipe(
    ofType(allDataWasLoaded),
    mapTo(true),
    startWith(false),
    shareReplay(1),
  );

  // should be treated as private
  _afterDataLoaded$: Observable<unknown> = this._isAllDataLoaded$.pipe(
    filter((v) => v),
    shareReplay(1),
  );

  _afterDataLoadedOnce$: Observable<unknown> = this._afterDataLoaded$.pipe(first());

  // CONTEXT LEVEL
  // -------------
  activeWorkContextId$: Observable<string | null> = this._isAllDataLoaded$.pipe(
    switchMap(() => this._store$),
    select(selectActiveContextId),
    distinctUntilChanged(),
    shareReplay(1),
  );
  // activeWorkContextType$: Observable<WorkContextType> = this._store$.pipe(select(selectActiveContextType));

  activeWorkContextTypeAndId$: Observable<{
    activeId: string;
    activeType: WorkContextType;
  }> = this._isAllDataLoaded$.pipe(
    switchMap(() => this._store$.select(selectActiveContextTypeAndId)),
    // NOTE: checking for id should be enough
    distinctUntilChanged((a, b): boolean => a.activeId === b.activeId),
    shareReplay(1),
  );
  isActiveWorkContextProject$: Observable<boolean> =
    this.activeWorkContextTypeAndId$.pipe(
      map(({ activeType }) => activeType === WorkContextType.PROJECT),
      shareReplay(1),
    );

  activeWorkContextIdIfProject$: Observable<string> =
    this.activeWorkContextTypeAndId$.pipe(
      map(({ activeType, activeId }) => {
        if (activeType !== WorkContextType.PROJECT) {
          throw Error('Not in project context');
        }
        return activeId;
      }),
    );

  // for convenience...
  activeWorkContextId?: string;
  activeWorkContextType?: WorkContextType;

  activeWorkContext$: Observable<WorkContext> = this._afterDataLoadedOnce$.pipe(
    switchMap(() => this._store$.select(selectActiveWorkContext)),
    shareReplay(1),
  );

  activeWorkContextTitle$: Observable<string> = this.activeWorkContext$.pipe(
    map((activeContext) => activeContext.title),
  );

  mainWorkContext$: Observable<WorkContext> = this._isAllDataLoaded$.pipe(
    concatMap(() => this._tagService.getTagById$(TODAY_TAG.id)),
    map(
      (mainWorkContext) =>
        ({
          ...mainWorkContext,
          type: WorkContextType.TAG,
          routerLink: `tag/${mainWorkContext.id}`,
          // TODO get pinned noteIds
          noteIds: [],
        }) as WorkContext,
    ),
    switchMap((mainWorkContext) =>
      mainWorkContext.id === TODAY_TAG.id && mainWorkContext.title === TODAY_TAG.title
        ? this._translateService.stream(T.G.TODAY_TAG_TITLE).pipe(
            distinctUntilChanged(),
            map((translation) => ({
              ...mainWorkContext,
              title: translation,
            })),
          )
        : of(mainWorkContext),
    ),
  );

  currentTheme$: Observable<WorkContextThemeCfg> = this.activeWorkContext$.pipe(
    map((awc) => awc.theme),
    distinctUntilChanged<WorkContextThemeCfg>(isShallowEqual),
  );

  advancedCfg$: Observable<WorkContextAdvancedCfg> = this.activeWorkContext$.pipe(
    map((awc) => awc.advancedCfg),
    distinctUntilChanged(distinctUntilChangedObject),
  );

  onWorkContextChange$: Observable<any> = this._actions$.pipe(
    ofType(setActiveWorkContext),
  );
  isContextChanging$: Observable<boolean> = this.onWorkContextChange$.pipe(
    switchMap(() => timer(50).pipe(mapTo(false), startWith(true))),
    startWith(false),
  );
  isContextChangingWithDelay$: Observable<boolean> = this.isContextChanging$.pipe(
    delayWhen((val) => (val ? of(undefined) : interval(60))),
  );

  // NOTES LEVEL
  // -----------
  notes$: Observable<Note[]> = this.activeWorkContext$.pipe(
    map((ac) => ac.noteIds),
    distinctUntilChanged(distinctUntilChangedSimpleArray),
    switchMap((taskIds) => this._getNotesByIds$(taskIds)),
    shareReplay(1),
  );

  // TASK LEVEL
  // ----------
  todaysTaskIds$: Observable<string[]> = this.activeWorkContext$.pipe(
    map((ac) => ac.taskIds),
    distinctUntilChanged(distinctUntilChangedSimpleArray),
    shareReplay(1),
  );

  backlogTaskIds$: Observable<string[]> = this.activeWorkContext$.pipe(
    map((ac) => ac.backlogTaskIds || []),
    distinctUntilChanged(distinctUntilChangedSimpleArray),
    shareReplay(1),
  );

  todaysTasks$: Observable<TaskWithSubTasks[]> = this.todaysTaskIds$.pipe(
    // tap(() => console.log('TRIGGER TODAY TASKS')),
    switchMap((taskIds) => this._getTasksByIds$(taskIds)),
    // TODO find out why this is triggered so often
    // tap(() => console.log('AFTER SWITCHMAP  TODAYSTASKS')),
    // map(to => to.filter(t => !!t)),
    shareReplay(1),
  );

  todaysTasksInProject$: Observable<TaskWithSubTasks[]> = this.todaysTasks$.pipe(
    map((tasks) =>
      tasks
        .filter(
          (task) =>
            task.tagIds.includes(TODAY_TAG.id) ||
            task.subTasks.some((subTask) => subTask.tagIds.includes(TODAY_TAG.id)),
        )
        .map((task) => ({
          ...task,
          subTasks: task.subTasks.filter((subTask) =>
            subTask.tagIds.includes(TODAY_TAG.id),
          ),
        })),
    ),
  );

  undoneTasks$: Observable<TaskWithSubTasks[]> = this.todaysTasks$.pipe(
    map((tasks) => tasks.filter((task) => task && !task.isDone)),
  );

  doneTasks$: Observable<TaskWithSubTasks[]> = this.todaysTasks$.pipe(
    map((tasks) => tasks.filter((task) => task && task.isDone)),
  );
  doneTaskIds$: Observable<string[]> = this._store$.select(
    selectDoneTaskIdsForActiveContext,
  );
  doneBacklogTaskIds$: Observable<string[] | undefined> = this._store$.select(
    selectDoneBacklogTaskIdsForActiveContext,
  );

  backlogTasks$: Observable<TaskWithSubTasks[]> = this.backlogTaskIds$.pipe(
    switchMap((ids) => this._getTasksByIds$(ids)),
  );

  allTasksForCurrentContext$: Observable<TaskWithSubTasks[]> = combineLatest([
    this.todaysTasks$,
    this.backlogTasks$,
  ]).pipe(map(([today, backlog]) => [...today, ...backlog]));

  startableTasksForActiveContext$: Observable<Task[]> = this._afterDataLoadedOnce$.pipe(
    switchMap(() => this._store$),
    select(selectStartableTasksForActiveContext),
    shareReplay(1),
  );

  trackableTasksForActiveContext$: Observable<Task[]> = this._afterDataLoadedOnce$.pipe(
    switchMap(() => this._store$),
    select(selectTrackableTasksForActiveContext),
  );

  workingToday$: Observable<any> = this._globalTrackingIntervalService.todayDateStr$.pipe(
    switchMap((worklogStrDate) => this.getTimeWorkedForDay$(worklogStrDate)),
  );

  workingTodayArchived$: Observable<number> =
    this._globalTrackingIntervalService.todayDateStr$.pipe(
      switchMap((worklogStrDate) =>
        this.getTimeWorkedForDayForArchivedTasks(worklogStrDate),
      ),
    );

  isHasTasksToWorkOn$: Observable<boolean> = this.todaysTasks$.pipe(
    map(hasTasksToWorkOn),
    distinctUntilChanged(),
  );

  estimateRemainingToday$: Observable<number> = this.todaysTasks$.pipe(
    map(mapEstimateRemainingFromTasks),
    distinctUntilChanged(),
  );

  todayRemainingInProject$: Observable<number> = this.todaysTasksInProject$.pipe(
    map(mapEstimateRemainingFromTasks),
    distinctUntilChanged(),
  );

  // allNonArchiveTasks$: Observable<TaskWithSubTasks[]> = combineLatest([
  //   this.todaysTasks$,
  //   this.backlogTasks$
  // ]).pipe(
  //   map(([today, backlog]) => ([
  //     ...today,
  //     ...backlog
  //   ]))
  // );

  flatDoneTodayNr$: Observable<number> = this.todaysTasks$.pipe(
    map((tasks) => flattenTasks(tasks)),
    map((tasks) => {
      const done = tasks.filter((task) => task.isDone);
      return done.length;
    }),
  );

  isToday: boolean = false;
  isToday$: Observable<boolean> = this.activeWorkContextId$.pipe(
    map((id) => id === TODAY_TAG.id),
    shareReplay(1),
  );

  constructor() {
    this.isToday$.subscribe((v) => (this.isToday = v));

    this.activeWorkContextTypeAndId$.subscribe((v) => {
      this.activeWorkContextId = v.activeId;
      this.activeWorkContextType = v.activeType;
    });

    // we need all data to be loaded before we dispatch a setActiveContext action
    this._router.events
      .pipe(
        // NOTE: when we use any other router event than NavigationEnd, the changes triggered
        // by the active context may occur before the current page component is unloaded
        filter((event) => event instanceof NavigationEnd),
        withLatestFrom(this._isAllDataLoaded$),
        concatMap(([next, isAllDataLoaded]) =>
          isAllDataLoaded
            ? of(next as NavigationEnd)
            : this._isAllDataLoaded$.pipe(
                filter((isLoaded) => isLoaded),
                take(1),
                mapTo(next as NavigationEnd),
              ),
        ),
      )
      .subscribe(({ urlAfterRedirects }: NavigationEnd) => {
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
        } else if (urlAfterRedirects.match(/timeline/)) {
          this._setActiveContext(TODAY_TAG.id, WorkContextType.TAG);
        }
      });
  }

  // TODO could be done better
  getTimeWorkedForDay$(day: string = this._dateService.todayStr()): Observable<number> {
    return this.isToday$.pipe(
      switchMap((isToday) =>
        isToday
          ? this.getTimeWorkedForDayForAllNonArchiveTasks$(day)
          : this.getTimeWorkedForDayTodaysTasks$(day),
      ),
    );
  }

  async getTimeWorkedForDayForArchivedTasks(
    day: string = this._dateService.todayStr(),
  ): Promise<number> {
    const isToday = await this.isToday$.pipe(first()).toPromise();
    const { activeId, activeType } = await this.activeWorkContextTypeAndId$
      .pipe(first())
      .toPromise();
    const taskArchiveState = await this._persistenceService.taskArchive.loadState();

    const { ids, entities } = taskArchiveState;
    const tasksWorkedOnToday: ArchiveTask[] = ids
      .map((id) => entities[id])
      .filter((t) => t?.timeSpentOnDay[day]) as ArchiveTask[];

    let tasksToConsider: ArchiveTask[] = [];
    if (isToday) {
      tasksToConsider = tasksWorkedOnToday;
    } else {
      if (activeType === WorkContextType.PROJECT) {
        tasksToConsider = tasksWorkedOnToday.filter((t) => t.projectId === activeId);
      } else {
        tasksToConsider = tasksWorkedOnToday.filter((t) => t.tagIds.includes(activeId));
      }
    }

    return getTimeSpentForDay(
      // avoid double counting parent and sub tasks
      tasksToConsider.filter((task) => !task.parentId),
      day,
    );
  }

  getTimeWorkedForDayForAllNonArchiveTasks$(day: string): Observable<number> {
    return this._store$.pipe(select(selectAllTasks)).pipe(
      map((tasks) =>
        getTimeSpentForDay(
          // avoid double counting parent and sub tasks
          tasks.filter((task) => !task.parentId),
          day,
        ),
      ),
      distinctUntilChanged(),
    );
  }

  getTimeWorkedForDayTodaysTasks$(day: string): Observable<number> {
    return this.todaysTasks$.pipe(
      map((tasks) => getTimeSpentForDay(tasks, day)),
      distinctUntilChanged(),
    );
  }

  getWorkStart$(day: string = this._dateService.todayStr()): Observable<number> {
    return this.activeWorkContext$.pipe(map((ctx) => ctx.workStart[day]));
  }

  getWorkEnd$(day: string = this._dateService.todayStr()): Observable<number> {
    return this.activeWorkContext$.pipe(map((ctx) => ctx.workEnd[day]));
  }

  getBreakTime$(day: string = this._dateService.todayStr()): Observable<number> {
    return this.activeWorkContext$.pipe(map((ctx) => ctx.breakTime[day]));
  }

  getBreakNr$(day: string = this._dateService.todayStr()): Observable<number> {
    return this.activeWorkContext$.pipe(map((ctx) => ctx.breakNr[day]));
  }

  async load(): Promise<void> {
    // NOTE: currently route has prevalence over everything else and as there is not state apart from
    // activeContextId, and activeContextType, we don't need to load it
    // const state = await this._persistenceService.context.loadState() || initialContextState;
    // this._store$.dispatch(loadWorkContextState({state}));
  }

  updateWorklogExportSettingsForCurrentContext(data: WorklogExportSettings): void {
    this._updateAdvancedCfgForCurrentContext('worklogExportSettings', {
      ...data,
    });
  }

  updateWorkStartForActiveContext(date: string, newVal: number): void {
    const payload: { id: string; date: string; newVal: number } = {
      id: this.activeWorkContextId as string,
      date,
      newVal,
    };
    const action =
      this.activeWorkContextType === WorkContextType.PROJECT
        ? updateProjectWorkStart(payload)
        : updateWorkStartForTag(payload);
    this._store$.dispatch(action);
  }

  updateWorkEndForActiveContext(date: string, newVal: number): void {
    const payload: { id: string; date: string; newVal: number } = {
      id: this.activeWorkContextId as string,
      date,
      newVal,
    };
    const action =
      this.activeWorkContextType === WorkContextType.PROJECT
        ? updateProjectWorkEnd(payload)
        : updateWorkEndForTag(payload);
    this._store$.dispatch(action);
  }

  addToBreakTimeForActiveContext(
    date: string = this._dateService.todayStr(),
    valToAdd: number,
  ): void {
    const payload: { id: string; date: string; valToAdd: number } = {
      id: this.activeWorkContextId as string,
      date,
      valToAdd,
    };
    const action =
      this.activeWorkContextType === WorkContextType.PROJECT
        ? addToProjectBreakTime(payload)
        : addToBreakTimeForTag(payload);
    this._store$.dispatch(action);
  }

  private _updateAdvancedCfgForCurrentContext(
    sectionKey: WorkContextAdvancedCfgKey,
    data: any,
  ): void {
    if (this.activeWorkContextType === WorkContextType.PROJECT) {
      this._store$.dispatch(
        updateProjectAdvancedCfg({
          projectId: this.activeWorkContextId as string,
          sectionKey,
          data,
        }),
      );
    } else if (this.activeWorkContextType === WorkContextType.TAG) {
      this._store$.dispatch(
        updateAdvancedConfigForTag({
          tagId: this.activeWorkContextId as string,
          sectionKey,
          data,
        }),
      );
    }
  }

  // we don't want a circular dependency that's why we do it here...
  private _getTasksByIds$(ids: string[]): Observable<TaskWithSubTasks[]> {
    if (!Array.isArray(ids)) {
      console.log({ ids });
      throw new Error('Invalid param provided for getByIds$ :(');
    }
    return this._store$.select(selectTasksWithSubTasksByIds, { ids });
  }

  // we don't want a circular dependency that's why we do it here...
  private _getNotesByIds$(ids: string[]): Observable<Note[]> {
    if (!Array.isArray(ids)) {
      console.log({ ids });
      throw new Error('Invalid param provided for getByIds$ :(');
    }
    return this._store$.select(selectNotesById, { ids });
  }

  // NOTE: NEVER call this from some place other than the route change stuff
  private _setActiveContext(activeId: string, activeType: WorkContextType): void {
    this._store$.dispatch(setActiveWorkContext({ activeId, activeType }));
  }
}
