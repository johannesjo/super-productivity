import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TimelineViewEntryType } from './timeline.model';
import { Task } from '../tasks/task.model';
import { WorkContextService } from '../work-context/work-context.service';
import { map } from 'rxjs/operators';
import { TaskService } from '../tasks/task.service';
import { combineLatest } from 'rxjs';

@Component({
  selector: 'timeline',
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimelineComponent {
  TimelineViewEntryType: typeof TimelineViewEntryType = TimelineViewEntryType;
  // timelineEntries$ = this._workContextService.todaysTasks$.pipe(
  timelineEntries$ = combineLatest([
    this._workContextService.startableTasksForActiveContext$,
    this._taskService.currentTaskId$,
  ]).pipe(
    map(([tasks, currentId]) => this.mapToViewEntries(tasks, currentId))
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

  private mapToViewEntries(tasks: Task[], currentId: string | null): any {
    // TODO make current always the first task
    const viewEntries: any[] = [];
    const scheduledTasks: any[] = [];

    let lastTime: any;
    let prev: any;
    let sortedTasks: Task[] = tasks;
    console.log(sortedTasks);

    if (currentId) {
      const currentTask = tasks.find(t => t.id === currentId);
      if (currentTask) {
        sortedTasks = [currentTask, ...tasks.filter(t => t.id !== currentId)] as Task[];
      }
    }

    sortedTasks.forEach((task, index, arr) => {
      // TODO replace with plannedAt
      if (task.reminderId && task.plannedAt) {
        scheduledTasks.push(task);
        return;
      }

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

      // console.log(time, lastTime);

      viewEntries.push({
        id: task.id,
        type: TimelineViewEntryType.TaskFull,
        time: (time === lastTime)
          ? 0
          : time,
        data: task,
      });
      lastTime = time;
    });

    // const lastEntry = viewEntries && viewEntries[viewEntries.length - 1];
    // console.log({lastEntry});
    //
    // if (lastEntry && lastEntry.type === TimelineViewEntryType.TaskFull) {
    //   const task = lastEntry.data;
    //   viewEntries.push({
    //     id: 'END',
    //     type: TimelineViewEntryType.WorkdayEnd,
    //     time: lastTime + Math.max(0, task.timeEstimate - task.timeSpent)
    //   });
    // }

    if (scheduledTasks.length) {
      scheduledTasks.forEach((scheduledTask, i) => {
        const firstEntryBeforeIndex = viewEntries.findIndex(viewEntry => viewEntry.time !== 0 && viewEntry.time >= scheduledTask.plannedAt);

        const splitTask = viewEntries[firstEntryBeforeIndex - 1]?.data;
        const scheduledTaskDuration = Math.max(0, scheduledTask.timeEstimate - scheduledTask.timeSpent);

        viewEntries.splice(firstEntryBeforeIndex || 0, 0, {
          id: scheduledTask.id,
          time: scheduledTask.plannedAt,
          type: TimelineViewEntryType.TaskFull,
          data: scheduledTask,
        });

        const isAddSplitTask = (splitTask && (splitTask.timeEstimate - splitTask.timeSpent > 0));
        if (isAddSplitTask) {
          viewEntries.splice(firstEntryBeforeIndex + 1, 0, {
            id: splitTask.id,
            time: scheduledTask.plannedAt + scheduledTaskDuration,
            type: TimelineViewEntryType.Text,
            data: '... ' + splitTask.title,
          });
        }

        const startIndexOfFollowing = firstEntryBeforeIndex + (isAddSplitTask ? 2 : 1);
        // eslint-disable-next-line @typescript-eslint/prefer-for-of
        for (let j = startIndexOfFollowing; j < viewEntries.length; j++) {
          const viewEntry = viewEntries[j];
          if (viewEntry.time) {
            viewEntry.time = viewEntry.time + scheduledTaskDuration;
          }
        }
      });
    }

    console.log(viewEntries);

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

  trackByFn(i: number, item: any) {
    return item.id;
  }
}
