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
import { EMPTY, Observable, of } from 'rxjs';
import { TaskService } from '../../tasks/task.service';
import { DialogTimeEstimateComponent } from '../../tasks/dialog-time-estimate/dialog-time-estimate.component';
import { IS_TOUCH_PRIMARY } from '../../../util/is-mouse-primary';
import { MatDialog } from '@angular/material/dialog';
import { T } from '../../../t.const';
import { Project } from '../../project/project.model';
import { ProjectService } from '../../project/project.service';
import { MatMenuTrigger } from '@angular/material/menu';
import { delay, first, takeUntil } from 'rxjs/operators';
import { IssueService } from '../../issue/issue.service';
import { BaseComponent } from '../../../core/base-component/base.component';
import { DialogEditTaskAttachmentComponent } from '../../tasks/task-attachment/dialog-edit-attachment/dialog-edit-task-attachment.component';
import { DialogEditTagsForTaskComponent } from '../../tag/dialog-edit-tags/dialog-edit-tags-for-task.component';
import { TaskAttachmentService } from '../../tasks/task-attachment/task-attachment.service';
import { Store } from '@ngrx/store';
import { selectTaskByIdWithSubTaskData } from '../../tasks/store/task.selectors';
import { updateTask } from '../../tasks/store/task.actions';
import { DialogScheduleTaskComponent } from '../dialog-schedule-task/dialog-schedule-task.component';
import { DialogTaskAdditionalInfoPanelComponent } from '../../tasks/dialog-task-additional-info-panel/dialog-task-additional-info-panel.component';

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
  issueUrl$!: Observable<string | null>;

  moveToProjectList$!: Observable<Project[]>;
  contextMenuPosition: { x: string; y: string } = { x: '0px', y: '0px' };

  @ViewChild('contextMenuTriggerEl', { static: true, read: MatMenuTrigger })
  contextMenu!: MatMenuTrigger;

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
      this._matDialog.open(DialogTaskAdditionalInfoPanelComponent, {
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
    private _issueService: IssueService,
    private _taskAttachmentService: TaskAttachmentService,
    private _store: Store,
  ) {
    super();
  }

  ngOnInit(): void {
    this.moveToProjectList$ = this.task.projectId
      ? this._projectService.getProjectsWithoutId$(this.task.projectId)
      : EMPTY;

    this.issueUrl$ =
      this.task.issueType && this.task.issueId && this.task.projectId
        ? this._issueService.issueLink$(
            this.task.issueType,
            this.task.issueId,
            this.task.projectId,
          )
        : of(null);

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
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    this.contextMenuPosition.x =
      ('touches' in event ? event.touches[0].clientX : event.clientX) + 'px';
    this.contextMenuPosition.y =
      ('touches' in event ? event.touches[0].clientY : event.clientY) + 'px';
    this.contextMenu.openMenu();
  }

  estimateTime(): void {
    this._matDialog.open(DialogTimeEstimateComponent, {
      data: { task: this.task, isFocusEstimateOnMousePrimaryDevice: true },
      autoFocus: !IS_TOUCH_PRIMARY,
    });
  }

  markAsDone(): void {
    this._store.dispatch(
      updateTask({
        task: {
          id: this.task.id,
          changes: {
            isDone: true,
          },
        },
      }),
    );
    // this._store.dispatch(
    //   updateTaskTags({
    //     task: this.task,
    //     newTagIds: unique([TODAY_TAG.id, ...this.task.tagIds]),
    //   }),
    // );
  }

  markAsUnDone(): void {
    this._store.dispatch(
      updateTask({
        task: {
          id: this.task.id,
          changes: {
            isDone: false,
          },
        },
      }),
    );
  }

  // TODO implement with keyboard support
  focusSelf(): void {}

  // convertToMainTask(): void {}
  // moveTaskToProject(projectId: string): void {}

  scheduleTask(): void {
    this._matDialog
      .open(DialogScheduleTaskComponent, {
        // we focus inside dialog instead
        autoFocus: false,
        data: { task: this.task, day: this.day },
      })
      .afterClosed()
      .pipe(takeUntil(this.onDestroy$))
      .subscribe(() => this.focusSelf());
  }

  updateIssueData(): void {
    this._issueService.refreshIssueTask(this.task, true, true);
  }

  addAttachment(): void {
    this._matDialog
      .open(DialogEditTaskAttachmentComponent, {
        data: {},
      })
      .afterClosed()
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((result) => {
        if (result) {
          this._taskAttachmentService.addAttachment(this.task.id, result);
        }
        this.focusSelf();
      });
  }

  async editTags(): Promise<void> {
    const taskToEdit = this.task.parentId
      ? await this._taskService.getByIdOnce$(this.task.parentId).toPromise()
      : this.task;
    this._matDialog
      .open(DialogEditTagsForTaskComponent, {
        data: {
          task: taskToEdit,
        },
      })
      .afterClosed()
      .pipe(takeUntil(this.onDestroy$))
      .subscribe(() => this.focusSelf());
  }

  deleteTask(isClick: boolean = false): void {
    this._store
      .select(selectTaskByIdWithSubTaskData, { id: this.task.id })
      .pipe(
        first(),
        takeUntil(this.onDestroy$),
        // NOTE without the delay selectTaskByIdWithSubTaskData triggers twice for unknown reasons
        delay(50),
      )
      .subscribe((task) => {
        this._taskService.remove(task);
      });
  }
}
