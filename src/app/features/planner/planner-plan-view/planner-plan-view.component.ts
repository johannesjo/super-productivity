import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Observable } from 'rxjs';
import { TASK_REMINDER_OPTIONS } from '../../tasks/dialog-add-task-reminder/task-reminder-options.const';
import { T } from '../../../t.const';
import { PlannerDay, ScheduleItemType } from '../planner.model';
import { Store } from '@ngrx/store';
import { PlannerService } from '../planner.service';
import { MatDialog } from '@angular/material/dialog';
import { TaskService } from '../../tasks/task.service';
import { ReminderService } from '../../reminder/reminder.service';

@Component({
  selector: 'planner-plan-view',
  templateUrl: './planner-plan-view.component.html',
  styleUrl: './planner-plan-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlannerPlanViewComponent {
  SCHEDULE_ITEM_TYPE = ScheduleItemType;
  // days$: Observable<PlannerDay[]> = of(PLANNER_DUMMY_DATA);

  days$: Observable<PlannerDay[]> = this._plannerService.days$;

  protected readonly remindAvailableOptions = TASK_REMINDER_OPTIONS;
  protected readonly T = T;

  constructor(
    private _store: Store,
    private _plannerService: PlannerService,
    private _matDialog: MatDialog,
    private _taskService: TaskService,
    private _reminderService: ReminderService,
  ) {}
}
