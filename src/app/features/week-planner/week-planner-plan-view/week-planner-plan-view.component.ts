import { ChangeDetectionStrategy, Component } from '@angular/core';
import { of } from 'rxjs';
import { TASK_REMINDER_OPTIONS } from '../../tasks/dialog-add-task-reminder/task-reminder-options.const';
import { T } from '../../../t.const';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { DEFAULT_TASK, TaskCopy } from '../../tasks/task.model';

const FAKE_TASK = {
  ...DEFAULT_TASK,
  id: '11',
  title: 'Default fake task',
};

@Component({
  selector: 'week-planner-plan-view',
  templateUrl: './week-planner-plan-view.component.html',
  styleUrl: './week-planner-plan-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeekPlannerPlanViewComponent {
  days$ = of([
    {
      dayDate: '2021-09-01',
      timeEstimate: 3,
      timeLimit: 7,
      tasks: [FAKE_TASK],
      scheduledIItems: [
        {
          type: 'TASK',
          id: 'aaa',
          task: FAKE_TASK,
        },
      ],
    },
    {
      dayDate: '2021-09-02',
      timeEstimate: 3,
      timeLimit: 7,
      tasks: [FAKE_TASK],
      scheduledIItems: [
        {
          type: 'TASK',
          id: 'aaa',
          task: FAKE_TASK,
        },
      ],
    },
    {
      dayDate: '2021-09-03',
      timeEstimate: 3,
      timeLimit: 7,
      tasks: [FAKE_TASK],
      scheduledIItems: [
        {
          type: 'TASK',
          id: 'aaa',
          task: FAKE_TASK,
        },
        {
          type: 'TASK',
          id: 'aaa',
          task: FAKE_TASK,
        },
      ],
    },
    {
      dayDate: '2021-09-04',
      timeEstimate: 3,
      timeLimit: 7,
      tasks: [FAKE_TASK],
      scheduledIItems: [
        {
          type: 'TASK',
          id: 'aaa',
          task: FAKE_TASK,
        },
        {
          type: 'TASK',
          id: 'aaa',
          task: FAKE_TASK,
        },
        {
          type: 'TASK',
          id: 'aaa',
          task: FAKE_TASK,
        },
      ],
    },
    {
      dayDate: '2021-09-05',
      timeEstimate: 4,
      timeLimit: 7,
      tasks: [FAKE_TASK],
      scheduledIItems: [
        {
          type: 'TASK',
          id: 'aaa',
          task: FAKE_TASK,
        },
        {
          type: 'TASK',
          id: 'aaa',
          task: FAKE_TASK,
        },
        {
          type: 'TASK',
          id: 'aaa',
          task: FAKE_TASK,
        },
      ],
    },
  ]);
  protected readonly remindAvailableOptions = TASK_REMINDER_OPTIONS;
  protected readonly T = T;

  // TODO correct type
  drop(targetList: 'TODO' | 'SCHEDULED', event: CdkDragDrop<(any | TaskCopy)[]>): void {
    if (targetList === 'SCHEDULED') {
      console.log('SCHEDULED');
      console.log(event);
      // TODO show schedule dialog
      return;
    }

    console.log('I am here!');
    console.log(event);

    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
      if (targetList === 'TODO') {
        const item = event.container.data[event.currentIndex];
        if (item.type) {
          // TODO remove reminder
          event.container.data[event.currentIndex] = item.task;
        }
      }
    }
  }
}
