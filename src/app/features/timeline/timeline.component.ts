import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TimelineViewEntry, TimelineViewEntryType } from './timeline.model';
import { WorkContextService } from '../work-context/work-context.service';
import { map, tap } from 'rxjs/operators';
import { TaskService } from '../tasks/task.service';
import { combineLatest, Observable } from 'rxjs';
import { mapToTimelineViewEntries } from './map-timeline-data/map-to-timeline-view-entries';
import { T } from 'src/app/t.const';
import { standardListAnimation } from '../../ui/animations/standard-list.ani';

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
    this._taskService.currentTaskId$,
  ]).pipe(
    // map(([tasks, currentId]) => mapToTimelineViewEntries(tasks, currentId, undefined)),
    map(([tasks, currentId]) => mapToTimelineViewEntries(tasks, currentId, {
      startTime: '9:00',
      endTime: '17:00',
    })),
    // NOTE: this doesn't require cd.detect changes because view is already re-checked with obs
    tap(() => this.now = Date.now())
  );
  now = Date.now();

  constructor(
    private _workContextService: WorkContextService,
    private _taskService: TaskService,
  ) {
  }

  trackByFn(i: number, item: any) {
    return item.id;
  }
}
