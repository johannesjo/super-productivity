import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TimelineViewEntry, TimelineViewEntryType } from './timeline.model';
import { WorkContextService } from '../work-context/work-context.service';
import { map } from 'rxjs/operators';
import { TaskService } from '../tasks/task.service';
import { combineLatest, Observable } from 'rxjs';
import { mapToTimelineViewEntries } from './map-timeline-data/map-to-timeline-view-entries';
import { T } from 'src/app/t.const';
import { standardListAnimation } from '../../ui/animations/standard-list.ani';

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
    // map(([tasks, currentId]) => mapToViewEntries(tasks, currentId, undefined))
    map(([tasks, currentId]) => mapToTimelineViewEntries(tasks, currentId, {
      startTime: '9:00',
      endTime: '17:00',
    }))
  );

  // timelineEntries$ = new BehaviorSubject([
  //   {
  //     type: TimelineViewEntryType.TaskFull,
  //     time: Date.now(),
  //     data: {
  //       ...DEFAULT_TASK,
  //       title: 'SomeTask',
  //     }
  //   },
  //   {
  //     type: TimelineViewEntryType.TaskFull,
  //     time: Date.now() + 60000 * 60,
  //     data: {
  //       ...DEFAULT_TASK,
  //       title: 'Some other task',
  //     }
  //   },
  //   {
  //     type: TimelineViewEntryType.TaskFull,
  //     time: Date.now() + 60000 * 60 * 2,
  //     data: {
  //       ...DEFAULT_TASK,
  //       title: 'Some event',
  //       isEvent: true,
  //     }
  //   },
  // ]);

  constructor(
    private _workContextService: WorkContextService,
    private _taskService: TaskService,
  ) {
  }

  trackByFn(i: number, item: any) {
    return item.id;
  }
}
