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
    this._taskService.allScheduledWithReminder$,
    this._taskService.currentTaskId$,
  ]).pipe(
    map(([startableTasks, scheduledTasks, currentId]) =>
      mapToTimelineViewEntries(startableTasks, scheduledTasks, currentId, undefined),
    ),
    // map(([startableTasks, scheduledTasks, currentId]) =>
    //   mapToTimelineViewEntries(startableTasks, scheduledTasks, currentId, {
    //     startTime: '9:00',
    //     endTime: '17:00',
    //   }),
    // ),
    // map(([startableTxasks, scheduxledTasks, currentId]) => {
    //   const v: any = {
    //     tasks: [
    //       {
    //         id: 'Kx5bTvHgj',
    //         projectId: null,
    //         subTaskIds: [],
    //         timeSpentOnDay: {},
    //         timeSpent: 0,
    //         timeEstimate: 3600000,
    //         isDone: false,
    //         doneOn: null,
    //         title: 'Task',
    //         notes: '',
    //         tagIds: ['TODAY'],
    //         parentId: null,
    //         reminderId: null,
    //         created: 1620240098331,
    //         repeatCfgId: null,
    //         plannedAt: null,
    //         _showSubTasksMode: 2,
    //         attachments: [],
    //         issueId: null,
    //         issuePoints: null,
    //         issueType: null,
    //         issueAttachmentNr: null,
    //         issueLastUpdated: null,
    //         issueWasUpdated: null,
    //       },
    //       {
    //         id: '3KvQVDFBT',
    //         projectId: null,
    //         subTaskIds: [],
    //         timeSpentOnDay: { '2021-05-05': 7999 },
    //         timeSpent: 7999,
    //         timeEstimate: 10800000,
    //         isDone: false,
    //         doneOn: null,
    //         title: "Test task longer and what not is that cool I don't know",
    //         notes: '',
    //         tagIds: ['TODAY'],
    //         parentId: null,
    //         reminderId: null,
    //         created: 1620227613690,
    //         repeatCfgId: null,
    //         plannedAt: null,
    //         _showSubTasksMode: 2,
    //         attachments: [],
    //         issueId: null,
    //         issuePoints: null,
    //         issueType: null,
    //         issueAttachmentNr: null,
    //         issueLastUpdated: null,
    //         issueWasUpdated: null,
    //       },
    //       {
    //         id: 'RlHPfiXYk',
    //         projectId: null,
    //         subTaskIds: [],
    //         timeSpentOnDay: { '2021-05-05': 1999 },
    //         timeSpent: 1999,
    //         timeEstimate: 0,
    //         isDone: false,
    //         doneOn: null,
    //         title: 'XXX',
    //         notes: '',
    //         tagIds: ['TODAY'],
    //         parentId: null,
    //         reminderId: 'wctU7fdUV',
    //         created: 1620239185383,
    //         repeatCfgId: null,
    //         plannedAt: 1620248400000,
    //         _showSubTasksMode: 2,
    //         attachments: [],
    //         issueId: null,
    //         issuePoints: null,
    //         issueType: null,
    //         issueAttachmentNr: null,
    //         issueLastUpdated: null,
    //         issueWasUpdated: null,
    //       },
    //       {
    //         id: 'xY44rpnb9',
    //         projectId: null,
    //         subTaskIds: [],
    //         timeSpentOnDay: {},
    //         timeSpent: 0,
    //         timeEstimate: 1800000,
    //         isDone: false,
    //         doneOn: null,
    //         title: 'SChed2',
    //         notes: '',
    //         tagIds: ['TODAY'],
    //         parentId: null,
    //         reminderId: '8ON1WZbSb',
    //         created: 1620227641668,
    //         repeatCfgId: null,
    //         plannedAt: 1620244800000,
    //         _showSubTasksMode: 2,
    //         attachments: [],
    //         issueId: null,
    //         issuePoints: null,
    //         issueType: null,
    //         issueAttachmentNr: null,
    //         issueLastUpdated: null,
    //         issueWasUpdated: null,
    //       },
    //       {
    //         id: 'LayqneCZ0',
    //         projectId: null,
    //         subTaskIds: [],
    //         timeSpentOnDay: {},
    //         timeSpent: 0,
    //         timeEstimate: 1800000,
    //         isDone: false,
    //         doneOn: null,
    //         title: 'Sched1',
    //         notes: '',
    //         tagIds: ['TODAY'],
    //         parentId: null,
    //         reminderId: 'NkonFINlM',
    //         created: 1620227624280,
    //         repeatCfgId: null,
    //         plannedAt: 1620241200000,
    //         _showSubTasksMode: 2,
    //         attachments: [],
    //         issueId: null,
    //         issuePoints: null,
    //         issueType: null,
    //         issueAttachmentNr: null,
    //         issueLastUpdated: null,
    //         issueWasUpdated: null,
    //       },
    //     ],
    //     currentId: null,
    //     workStartEndCfg: { startTime: '9:00', endTime: '17:00' },
    //     now: 1620240317297,
    //   };
    //
    //   return mapToTimelineViewEntries(
    //     v.tasks,
    //     v.tasks.filter((t: any) => t.plannedAt && t.reminderId),
    //     v.currentId,
    //     v.workStartEndCfg,
    //     v.now,
    //   );
    // }),
    // NOTE: this doesn't require cd.detect changes because view is already re-checked with obs
    tap(() => (this.now = Date.now())),
  );
  now: number = Date.now();
  tomorrow: number = getTomorrow(0).getTime();

  constructor(
    private _workContextService: WorkContextService,
    private _taskService: TaskService,
  ) {}

  trackByFn(i: number, item: any) {
    return item.id;
  }
}
