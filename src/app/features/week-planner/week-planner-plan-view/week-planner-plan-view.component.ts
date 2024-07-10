import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Observable, of } from 'rxjs';
import { TASK_REMINDER_OPTIONS } from '../../tasks/dialog-add-task-reminder/task-reminder-options.const';
import { T } from '../../../t.const';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { TaskCopy } from '../../tasks/task.model';
import { ScheduleItemType, WeekPlannerDay } from '../week-planner.model';
import { WEEK_PLANNER_DUMMY_DATA } from '../week-planner-dummy-data.const';

@Component({
  selector: 'week-planner-plan-view',
  templateUrl: './week-planner-plan-view.component.html',
  styleUrl: './week-planner-plan-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeekPlannerPlanViewComponent {
  SCHEDULE_ITEM_TYPE = ScheduleItemType;
  days$: Observable<WeekPlannerDay[]> = of(WEEK_PLANNER_DUMMY_DATA);
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
