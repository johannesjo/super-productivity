import { ChangeDetectionStrategy, Component } from '@angular/core';
import { of } from 'rxjs';
import { TASK_REMINDER_OPTIONS } from '../../tasks/dialog-add-task-reminder/task-reminder-options.const';
import { T } from '../../../t.const';

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
      taskIds: ['1', '2'],
      scheduledIItems: [
        {
          type: 'TASK',
          id: 'aaa',
        },
      ],
    },
    {
      dayDate: '2021-09-02',
      timeEstimate: 3,
      timeLimit: 7,
      taskIds: ['1', '2'],
      scheduledIItems: [
        {
          type: 'TASK',
          id: 'aaa',
        },
      ],
    },
    {
      dayDate: '2021-09-03',
      timeEstimate: 3,
      timeLimit: 7,
      taskIds: ['1', '4', '5', '6'],
      scheduledIItems: [
        {
          type: 'TASK',
          id: 'aa asdasa',
        },
        {
          type: 'TASK',
          id: 'aa aaasd',
        },
      ],
    },
    {
      dayDate: '2021-09-04',
      timeEstimate: 3,
      timeLimit: 7,
      taskIds: ['1', '4', '5', '7', '8'],
      scheduledIItems: [
        {
          type: 'TASK',
          id: 'aa asdasa',
        },
        {
          type: 'TASK',
          id: 'aa aaasd',
        },
        {
          type: 'TASK',
          id: 'aa aaasd',
        },
      ],
    },
    {
      dayDate: '2021-09-05',
      timeEstimate: 4,
      timeLimit: 7,
      taskIds: ['1', '4', '5', '7', '8'],
      scheduledIItems: [
        {
          type: 'TASK',
          id: 'aa asdasa',
        },
        {
          type: 'TASK',
          id: 'aa aaasd',
        },
        {
          type: 'TASK',
          id: 'aa aaasd',
        },
      ],
    },
  ]);
  protected readonly remindAvailableOptions = TASK_REMINDER_OPTIONS;
  protected readonly T = T;
}
