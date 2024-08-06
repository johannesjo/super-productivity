import { ChangeDetectionStrategy, Component, OnDestroy } from '@angular/core';
import { TimelineViewEntry } from './timeline.model';
import {
  debounceTime,
  distinctUntilChanged,
  map,
  startWith,
  switchMap,
  tap,
} from 'rxjs/operators';
import { TaskService } from '../tasks/task.service';
import { combineLatest, forkJoin, Observable, of } from 'rxjs';
import { mapToTimelineViewEntries } from './map-timeline-data/map-to-timeline-view-entries';
import { T } from 'src/app/t.const';
import { standardListAnimation } from '../../ui/animations/standard-list.ani';
import { getTomorrow } from '../../util/get-tomorrow';
import { TimelineViewEntryType } from './timeline.const';
import { GlobalConfigService } from '../config/global-config.service';
import { MatDialog } from '@angular/material/dialog';
import { LS } from '../../core/persistence/storage-keys.const';
import { DialogTimelineSetupComponent } from '../schedule/dialog-timeline-setup/dialog-timeline-setup.component';
import { TaskRepeatCfgService } from '../task-repeat-cfg/task-repeat-cfg.service';
import { Task, TaskPlanned } from '../tasks/task.model';
import { DialogAddTaskReminderComponent } from '../tasks/dialog-add-task-reminder/dialog-add-task-reminder.component';
import { AddTaskReminderInterface } from '../tasks/dialog-add-task-reminder/add-task-reminder-interface';
import { loadFromRealLs, saveToRealLs } from '../../core/persistence/local-storage';
import { select, Store } from '@ngrx/store';
import { selectCalendarProviders } from '../config/store/global-config.reducer';
import { CalendarIntegrationService } from '../calendar-integration/calendar-integration.service';
import { selectAllCalendarTaskEventIds } from '../tasks/store/task.selectors';
import { CalendarIntegrationEvent } from '../calendar-integration/calendar-integration.model';
import { distinctUntilChangedObject } from '../../util/distinct-until-changed-object';
import { selectTimelineTasks } from '../work-context/store/work-context.selectors';
import { ScheduleCalendarMapEntry } from '../schedule/schedule.model';

@Component({
  selector: 'schedule',
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [standardListAnimation],
})
export class TimelineComponent implements OnDestroy {
  T: typeof T = T;
  TimelineViewEntryType: typeof TimelineViewEntryType = TimelineViewEntryType;

  timelineTasks$: Observable<{
    planned: TaskPlanned[];
    unPlanned: Task[];
  }> = this._store.pipe(select(selectTimelineTasks));

  icalEvents$: Observable<ScheduleCalendarMapEntry[]> = this._store
    .select(selectCalendarProviders)
    .pipe(
      switchMap((calendarProviders) =>
        this._store.select(selectAllCalendarTaskEventIds).pipe(
          map((allCalendarTaskEventIds) => ({
            allCalendarTaskEventIds,
            calendarProviders,
          })),
        ),
      ),
      distinctUntilChanged(distinctUntilChangedObject),
      switchMap(({ allCalendarTaskEventIds, calendarProviders }) => {
        return calendarProviders && calendarProviders.length
          ? forkJoin(
              calendarProviders
                .filter((calProvider) => calProvider.isEnabled)
                .map((calProvider) =>
                  this._calendarIntegrationService
                    .requestEventsForTimeline(calProvider)
                    .pipe(
                      // filter out items already added as tasks
                      map((calEvs) =>
                        calEvs.filter(
                          (calEv) => !allCalendarTaskEventIds.includes(calEv.id),
                        ),
                      ),
                      map((items: CalendarIntegrationEvent[]) => ({
                        items,
                        icon: calProvider.icon || null,
                      })),
                    ),
                ),
            ).pipe(
              tap((val) => {
                saveToRealLs(LS.SCHEDULE_CACHE, val);
              }),
            )
          : of([] as any);
      }),
      startWith(this._getCalProviderFromCache()),
    );

  timelineEntries$: Observable<TimelineViewEntry[]> = combineLatest([
    this.timelineTasks$,
    this._taskRepeatCfgService.taskRepeatCfgsWithStartTime$,
    this.taskService.currentTaskId$,
    this._globalConfigService.timelineCfg$,
    this.icalEvents$,
  ]).pipe(
    debounceTime(50),
    map(([{ planned, unPlanned }, taskRepeatCfgs, currentId, timelineCfg, icalEvents]) =>
      mapToTimelineViewEntries(
        unPlanned,
        planned,
        taskRepeatCfgs,
        icalEvents,
        currentId,
        timelineCfg?.isWorkStartEndEnabled
          ? {
              startTime: timelineCfg.workStart,
              endTime: timelineCfg.workEnd,
            }
          : undefined,
        timelineCfg?.isLunchBreakEnabled
          ? {
              startTime: timelineCfg.lunchBreakStart,
              endTime: timelineCfg.lunchBreakEnd,
            }
          : undefined,
      ),
    ),

    // NOTE: this doesn't require cd.detect changes because view is already re-checked with obs
    tap(() => (this.now = Date.now())),
  );
  now: number = Date.now();
  tomorrow: number = getTomorrow(0).getTime();

  private _moveUpTimeout?: number;
  private _moveDownTimeout?: number;

  constructor(
    public taskService: TaskService,
    private _taskRepeatCfgService: TaskRepeatCfgService,
    private _globalConfigService: GlobalConfigService,
    private _matDialog: MatDialog,
    private _store: Store,
    private _calendarIntegrationService: CalendarIntegrationService,
  ) {
    if (!localStorage.getItem(LS.WAS_SCHEDULE_INITIAL_DIALOG_SHOWN)) {
      this._matDialog.open(DialogTimelineSetupComponent, {
        data: { isInfoShownInitially: true },
      });
    }
  }

  ngOnDestroy(): void {
    window.clearTimeout(this._moveUpTimeout);
    window.clearTimeout(this._moveDownTimeout);
  }

  trackByFn(i: number, item: any): string {
    return item.id;
  }

  getSizeClass(timelineEntry: TimelineViewEntry): string {
    // TODO fix that this is being reRendered on every hover
    const d =
      // @ts-ignore
      timelineEntry?.data?.timeEstimate ||
      // @ts-ignore
      timelineEntry?.data?.timeToGo ||
      // @ts-ignore
      timelineEntry?.data?.defaultEstimate;
    const h = d && d / 60 / 60 / 1000;

    // if (h && h >= 4.5) return 'xxxl row';
    if (h && h >= 3.5) return 'xxl row';
    if (h && h >= 2.5) return 'xl row';
    if (h && h >= 1.5) return 'l row';
    return 'row';
  }

  async moveUp(task: Task): Promise<void> {
    this.taskService.moveUp(task.id, task.parentId, false);
    window.clearTimeout(this._moveUpTimeout);
    window.setTimeout(() => this.taskService.focusTask(task.id), 50);
  }

  async moveDown(task: Task): Promise<void> {
    this.taskService.moveDown(task.id, task.parentId, false);
    window.clearTimeout(this._moveDownTimeout);
    window.setTimeout(() => this.taskService.focusTask(task.id), 50);
  }

  editTaskReminder(task: Task): void {
    // NOTE: this also might schedule an unscheduled sub task of a scheduled parent
    this._matDialog.open(DialogAddTaskReminderComponent, {
      data: { task } as AddTaskReminderInterface,
    });
  }

  private _getCalProviderFromCache(): ScheduleCalendarMapEntry[] {
    const now = Date.now();
    return (
      ((loadFromRealLs(LS.SCHEDULE_CACHE) as ScheduleCalendarMapEntry[]) || [])
        // filter out cached past entries
        .map((provider) => ({
          ...provider,
          items: provider.items.filter((item) => item.start + item.duration >= now),
        }))
    );
  }
}
