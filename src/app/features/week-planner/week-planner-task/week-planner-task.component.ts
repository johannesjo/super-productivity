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

@Component({
  selector: 'week-planner-task',
  templateUrl: './week-planner-task.component.html',
  styleUrl: './week-planner-task.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeekPlannerTaskComponent implements OnInit, OnDestroy {
  @Input({ required: true }) task!: TaskCopy;

  parentTitle: string | null = null;
  private _subs = new Subscription();

  constructor(
    private _taskService: TaskService,
    private _cd: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    console.log(this.task);
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
}
