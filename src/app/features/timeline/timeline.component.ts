import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TimelineViewEntryType } from './timeline.model';
import { Task } from '../tasks/task.model';
import { WorkContextService } from '../work-context/work-context.service';
import { map } from 'rxjs/operators';

@Component({
  selector: 'timeline',
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimelineComponent {
  TimelineViewEntryType: typeof TimelineViewEntryType = TimelineViewEntryType;
  // timelineEntries$ = this._workContextService.todaysTasks$.pipe(
  timelineEntries$ = this._workContextService.startableTasksForActiveContext$.pipe(
    map(tasks => this.mapToViewEntries(tasks))
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
  ) {
  }

  private mapToViewEntries(tasks: Task[]): any {
    // TODO make current always the first task
    const viewEntries: any[] = [];
    let lastTime: any;
    let prev: any;
    console.log(tasks);

    tasks.forEach((task, index, arr) => {
      prev = arr[index - 1];
      let time;

      if (lastTime) {
        if (prev) {
          time = lastTime + Math.max(0, prev.timeEstimate - prev.timeSpent);
        } else {
          time = lastTime;
        }
      } else {
        time = Date.now();
      }

      console.log(time, lastTime);

      viewEntries.push({
        type: TimelineViewEntryType.TaskFull,
        time: (time === lastTime)
          ? 0
          : time,
        data: task,
      });
      lastTime = time;
    });

    const lastEntry = viewEntries && viewEntries[viewEntries.length - 1];
    console.log({lastEntry});

    if (lastEntry && lastEntry.type === TimelineViewEntryType.TaskFull) {
      const task = lastEntry.data;
      viewEntries.push({
        type: TimelineViewEntryType.WorkdayEnd,
        time: lastTime + Math.max(0, task.timeEstimate - task.timeSpent)
      });
    }

    return viewEntries;
    //   {
    //     type: TimelineViewEntryType.TaskFull,
    //     time: Date.now(),
    //     data: {
    //       ...DEFAULT_TASK,
    //       title: 'SomeTask',
    //     }
    //   },
  }

}
