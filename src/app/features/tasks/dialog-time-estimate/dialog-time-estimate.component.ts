import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { Task, TaskCopy, TimeSpentOnDayCopy } from '../task.model';
import { TaskService } from '../task.service';
import { getTodayStr } from '../util/get-today-str';
import { createTaskCopy } from '../util/create-task-copy';
import { DialogAddTimeEstimateForOtherDayComponent } from '../dialog-add-time-estimate-for-other-day/dialog-add-time-estimate-for-other-day.component';
import { getWorklogStr } from '../../../util/get-work-log-str';
import { T } from '../../../t.const';
import { FormsModule } from '@angular/forms';
import { HelpSectionComponent } from '../../../ui/help-section/help-section.component';
import { InputDurationSliderComponent } from '../../../ui/duration/input-duration-slider/input-duration-slider.component';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatLabel, MatPrefix } from '@angular/material/form-field';
import { InputDurationDirective } from '../../../ui/duration/input-duration.directive';
import { MatInput } from '@angular/material/input';
import { KeysPipe } from '../../../ui/pipes/keys.pipe';
import { TranslatePipe } from '@ngx-translate/core';
import { PlannerService } from '../../planner/planner.service';
import { first } from 'rxjs/operators';

@Component({
  selector: 'dialog-time-estimate',
  templateUrl: './dialog-time-estimate.component.html',
  styleUrls: ['./dialog-time-estimate.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogTitle,
    FormsModule,
    MatDialogContent,
    HelpSectionComponent,
    InputDurationSliderComponent,
    MatButton,
    MatIcon,
    MatFormField,
    MatLabel,
    InputDurationDirective,
    MatInput,
    MatPrefix,
    MatIconButton,
    MatDialogActions,
    MatDialogClose,
    KeysPipe,
    TranslatePipe,
  ],
})
export class DialogTimeEstimateComponent implements AfterViewInit {
  private _matDialogRef = inject<MatDialogRef<DialogTimeEstimateComponent>>(MatDialogRef);
  private _matDialog = inject(MatDialog);
  private _taskService = inject(TaskService);
  private _plannerService = inject(PlannerService);
  private _cd = inject(ChangeDetectorRef);
  private _el = inject(ElementRef);
  data = inject(MAT_DIALOG_DATA);

  T: typeof T = T;
  todayStr: string;
  task: Task;
  taskCopy: TaskCopy;
  timeSpentOnDayCopy: TimeSpentOnDayCopy;

  constructor() {
    const _taskService = this._taskService;

    this.task = this.data.task;
    this.todayStr = getTodayStr();
    this._taskService = _taskService;
    this.taskCopy = createTaskCopy(this.task);
    this.timeSpentOnDayCopy = this.taskCopy.timeSpentOnDay || {};
  }

  ngAfterViewInit(): void {
    if (this.data.isFocusEstimateOnMousePrimaryDevice) {
      this._el.nativeElement.querySelectorAll('input')?.[1]?.focus();
    }
  }

  async submit(): Promise<void> {
    const plannerTaskMap = await this._plannerService.plannedTaskDayMap$
      .pipe(first())
      .toPromise();
    const plannedDayForTask = plannerTaskMap[this.task.id];

    const updatedTimeSpentOnPlannedDay = { ...this.timeSpentOnDayCopy };
    if (this.todayStr > plannedDayForTask) {
      updatedTimeSpentOnPlannedDay[plannedDayForTask] =
        this.timeSpentOnDayCopy[this.todayStr];
      delete updatedTimeSpentOnPlannedDay[this.todayStr];
    }

    this._taskService.update(this.taskCopy.id, {
      timeEstimate: this.taskCopy.timeEstimate,
      timeSpentOnDay: updatedTimeSpentOnPlannedDay,
    });
    this._matDialogRef.close({
      timeEstimate: this.taskCopy.timeEstimate,
      timeSpentOnDay: updatedTimeSpentOnPlannedDay,
    });
  }

  showAddForAnotherDayForm(): void {
    this._matDialog
      .open(DialogAddTimeEstimateForOtherDayComponent)
      .afterClosed()
      .subscribe((result) => {
        if (result && result.timeSpent > 0 && result.date) {
          this.timeSpentOnDayCopy = {
            ...this.timeSpentOnDayCopy,
            [getWorklogStr(result.date)]: result.timeSpent,
          };
          this.taskCopy.timeSpentOnDay = this.timeSpentOnDayCopy;
          this._cd.detectChanges();
        }
      });
  }

  deleteValue(strDate: string): void {
    delete this.timeSpentOnDayCopy[strDate];
  }

  trackByIndex(i: number, p: any): number {
    return i;
  }
}
