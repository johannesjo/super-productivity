import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostBinding,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { TaskCopy } from '../../tasks/task.model';
import { EMPTY, Observable } from 'rxjs';
import { TaskService } from '../../tasks/task.service';
import { DialogTimeEstimateComponent } from '../../tasks/dialog-time-estimate/dialog-time-estimate.component';
import { IS_TOUCH_PRIMARY } from '../../../util/is-mouse-primary';
import { MatDialog } from '@angular/material/dialog';
import { T } from '../../../t.const';
import { Project } from '../../project/project.model';
import { ProjectService } from '../../project/project.service';
import { takeUntil } from 'rxjs/operators';
import { BaseComponent } from '../../../core/base-component/base.component';
import { DialogTaskDetailPanelComponent } from '../../tasks/dialog-task-detail-panel/dialog-task-detail-panel.component';
import { TaskContextMenuComponent } from '../../tasks/task-context-menu/task-context-menu.component';

@Component({
  selector: 'planner-task',
  templateUrl: './planner-task.component.html',
  styleUrl: './planner-task.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlannerTaskComponent extends BaseComponent implements OnInit, OnDestroy {
  @Input({ required: true }) task!: TaskCopy;
  @Input() day?: string;
  @Input() overWriteTimeEstimate: number = 0;

  isRepeatTaskCreatedToday = false;

  readonly T = T;
  readonly IS_TOUCH_PRIMARY = IS_TOUCH_PRIMARY;
  parentTitle: string | null = null;

  moveToProjectList$!: Observable<Project[]>;

  @ViewChild('taskContextMenu', { static: true, read: TaskContextMenuComponent })
  taskContextMenu?: TaskContextMenuComponent;

  @HostBinding('class.isDone')
  get isDone(): boolean {
    return this.task.isDone;
  }

  @HostBinding('class.isCurrent')
  get isCurrent(): boolean {
    return this.task.id === this._taskService.currentTaskId;
  }

  @HostListener('click', ['$event'])
  async clickHandler(): Promise<void> {
    if (this.task) {
      this._matDialog.open(DialogTaskDetailPanelComponent, {
        data: { taskId: this.task.id },
      });
    }
  }

  // @HostListener('dblclick', ['$event'])
  // async dblClickHandler(): Promise<void> {
  //   if (this.task) {
  //     this._matDialog.open(DialogTaskAdditionalInfoPanelComponent, {
  //       data: { taskId: this.task.id },
  //     });
  //   }
  // }

  get timeEstimate(): number {
    const t = this.task;
    return this.task.subTaskIds
      ? t.timeEstimate
      : t.timeEstimate - t.timeSpent > 0
        ? t.timeEstimate - t.timeSpent
        : 0;
  }

  constructor(
    private _taskService: TaskService,
    private _cd: ChangeDetectorRef,
    private _matDialog: MatDialog,
    private _projectService: ProjectService,
  ) {
    super();
  }

  ngOnInit(): void {
    this.moveToProjectList$ = this.task.projectId
      ? this._projectService.getProjectsWithoutId$(this.task.projectId)
      : EMPTY;

    if (this.task.parentId) {
      this._taskService
        .getByIdLive$(this.task.parentId)
        .pipe(takeUntil(this.onDestroy$))
        .subscribe((parentTask) => {
          this.parentTitle = parentTask && parentTask.title;
          this._cd.markForCheck();
          this._cd.detectChanges();
        });
    }
  }

  // NOTE: this prevents dragging on mobile for no touch area
  onTouchStart(event: TouchEvent): void {
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  openContextMenu(event: TouchEvent | MouseEvent): void {
    this.taskContextMenu?.open(event);
  }

  estimateTime(ev: MouseEvent): void {
    ev.preventDefault();
    ev.stopPropagation();
    this._matDialog.open(DialogTimeEstimateComponent, {
      data: { task: this.task, isFocusEstimateOnMousePrimaryDevice: true },
      autoFocus: !IS_TOUCH_PRIMARY,
    });
  }

  // TODO implement with keyboard support
  focusSelf(): void {}
}
