import {ChangeDetectionStrategy, Component, ComponentFactoryResolver, EventEmitter, Input, Output} from '@angular/core';
import {ShowSubTasksMode, TaskWithSubTasks} from '../task.model';
import {IssueService} from '../../issue/issue.service';
import {AttachmentService} from '../../attachment/attachment.service';
import {BehaviorSubject, Observable, of} from 'rxjs';
import {Attachment} from '../../attachment/attachment.model';
import {switchMap} from 'rxjs/operators';
import {T} from '../../../t.const';
import {TaskService} from '../task.service';
import {expandAnimation} from '../../../ui/animations/expand.ani';
import {fadeAnimation} from '../../../ui/animations/fade.ani';
import {swirlAnimation} from '../../../ui/animations/swirl-in-out.ani';
import {DialogTimeEstimateComponent} from '../dialog-time-estimate/dialog-time-estimate.component';
import {MatDialog} from '@angular/material/dialog';
import {isTouch} from '../../../util/is-touch';
import {DialogAddTaskReminderComponent} from '../dialog-add-task-reminder/dialog-add-task-reminder.component';
import {AddTaskReminderInterface} from '../dialog-add-task-reminder/add-task-reminder-interface';
import {ReminderCopy} from '../../reminder/reminder.model';
import {ReminderService} from '../../reminder/reminder.service';

@Component({
  selector: 'task-additional-info',
  templateUrl: './task-additional-info.component.html',
  styleUrls: ['./task-additional-info.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation, fadeAnimation, swirlAnimation]
})
export class TaskAdditionalInfoComponent {
  T = T;
  issueAttachments: Attachment[];
  taskData: TaskWithSubTasks;
  ShowSubTasksMode = ShowSubTasksMode;
  reminderId$ = new BehaviorSubject(null);
  reminderData$: Observable<ReminderCopy> = this.reminderId$.pipe(
    switchMap(id => id
      ? this._reminderService.getById$(id)
      : of(null)
    ),
  );

  @Input() selectedIndex = 0;
  @Output() taskNotesChanged: EventEmitter<string> = new EventEmitter();
  @Output() tabIndexChange: EventEmitter<number> = new EventEmitter();

  private _attachmentIds$ = new BehaviorSubject([]);
  localAttachments$: Observable<Attachment[]> = this._attachmentIds$.pipe(
    switchMap((ids) => this.attachmentService.getByIds$(ids))
  );

  constructor(
    private _resolver: ComponentFactoryResolver,
    private _issueService: IssueService,
    private _taskService: TaskService,
    private _reminderService: ReminderService,
    private readonly _matDialog: MatDialog,
    public attachmentService: AttachmentService,
  ) {
  }

  @Input() set task(val: TaskWithSubTasks) {
    this.taskData = val;
    this._attachmentIds$.next(this.taskData.attachmentIds);
    this.issueAttachments = this._issueService.getMappedAttachments(this.taskData.issueType, this.taskData.issueData);
    this.reminderId$.next(val.reminderId);
  }

  get task() {
    return this.taskData;
  }

  get progress() {
    return this.taskData && this.taskData.timeEstimate && (this.taskData.timeSpent / this.taskData.timeEstimate) * 100;
  }

  changeTaskNotes($event: string) {
    this.taskNotesChanged.emit($event);
  }


  close() {
    this._taskService.setSelectedId(null);
  }

  updateTaskTitleIfChanged(isChanged: boolean, newTitle: string) {
    if (isChanged) {
      this._taskService.update(this.taskData.id, {title: newTitle});
    }
  }

  estimateTime() {
    this._matDialog
      .open(DialogTimeEstimateComponent, {
        data: {task: this.task},
        autoFocus: !isTouch(),
      });
  }

  editReminder() {
    if (this.task.repeatCfgId) {
      return;
    }

    this._matDialog.open(DialogAddTaskReminderComponent, {
      restoreFocus: true,
      data: {
        title: this.task.title,
        taskId: this.task.id,
        reminderId: this.task.reminderId,
        isMoveToBacklogPossible: !this.task.parentId,
      } as AddTaskReminderInterface
    });
  }
}
