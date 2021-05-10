import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TimelineViewEntry } from './timeline.model';
import { WorkContextService } from '../work-context/work-context.service';
import { map, tap } from 'rxjs/operators';
import { TaskService } from '../tasks/task.service';
import { combineLatest, Observable } from 'rxjs';
import { mapToTimelineViewEntries } from './map-timeline-data/map-to-timeline-view-entries';
import { T } from 'src/app/t.const';
import { standardListAnimation } from '../../ui/animations/standard-list.ani';
import { getTomorrow } from '../../util/get-tomorrow';
import { TimelineViewEntryType } from './timeline.const';
import { GlobalConfigService } from '../config/global-config.service';

// const d = new Date();
// d.setTime(13);
// const FAKE_TIMELINE_EVENTS: TimelineCustomEvent[] = [{
//   title: 'Mittagspause',
//   duration: 60000 * 60,
//   start: d.getTime(),
//   icon: 'restaurant'
// }, {
//   title: 'Spazieren am Nachmittag',
//   duration: 60000 * 60 * .25,
//   start: Date.now() + 60000 * 60 * 2,
//   icon: 'nature',
// }];

@Component({
  selector: 'timeline',
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [standardListAnimation],
})
export class TimelineComponent {
  T: typeof T = T;
  TimelineViewEntryType: typeof TimelineViewEntryType = TimelineViewEntryType;
  // timelineEntries$ = this._workContextService.todaysTasks$.pipe(
  timelineEntries$: Observable<TimelineViewEntry[]> = combineLatest([
    this._workContextService.startableTasksForActiveContext$,
    this._taskService.plannedTasksForTimeline$,
    this._taskService.currentTaskId$,
    this._globalConfigService.timelineCfg$,
  ]).pipe(
    map(([startableTasks, scheduledTasks, currentId, timelineCfg]) =>
      mapToTimelineViewEntries(
        startableTasks,
        scheduledTasks,
        currentId,
        timelineCfg?.isWorkStartEndEnabled
          ? {
              startTime: timelineCfg.workStart,
              endTime: timelineCfg.workEnd,
            }
          : undefined,
      ),
    ),
    // NOTE: this doesn't require cd.detect changes because view is already re-checked with obs
    tap(() => (this.now = Date.now())),
  );
  now: number = Date.now();
  tomorrow: number = getTomorrow(0).getTime();

  constructor(
    private _workContextService: WorkContextService,
    private _taskService: TaskService,
    private _globalConfigService: GlobalConfigService,
  ) {}

  trackByFn(i: number, item: any) {
    return item.id;
  }
}
