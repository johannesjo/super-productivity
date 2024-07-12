import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { TaskCopy } from '../../tasks/task.model';
import { Subscription } from 'rxjs';
import { TaskService } from '../../tasks/task.service';
import { DialogTimeEstimateComponent } from '../../tasks/dialog-time-estimate/dialog-time-estimate.component';
import { IS_TOUCH_PRIMARY } from '../../../util/is-mouse-primary';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'planner-task',
  templateUrl: './planner-task.component.html',
  styleUrl: './planner-task.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlannerTaskComponent implements OnInit, OnDestroy {
  @Input({ required: true }) task!: TaskCopy;

  parentTitle: string | null = null;
  private _subs = new Subscription();

  constructor(
    private _taskService: TaskService,
    private _cd: ChangeDetectorRef,
    private _matDialog: MatDialog,
  ) {}

  ngOnInit(): void {
    if (this.task.parentId) {
      this._subs.add(
        this._taskService.getByIdLive$(this.task.parentId).subscribe((parentTask) => {
          this.parentTitle = parentTask && parentTask.title;
          this._cd.markForCheck();
          this._cd.detectChanges();
        }),
      );
    }
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  estimateTime(): void {
    this._matDialog.open(DialogTimeEstimateComponent, {
      data: { task: this.task },
      autoFocus: !IS_TOUCH_PRIMARY,
    });
  }
}
