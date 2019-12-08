import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ComponentFactoryResolver,
  EventEmitter,
  HostBinding,
  Input,
  OnDestroy,
  Output,
  QueryList,
  ViewChildren
} from '@angular/core';
import {TaskWithSubTasks} from '../task.model';
import {IssueService} from '../../issue/issue.service';
import {AttachmentService} from '../../attachment/attachment.service';
import {BehaviorSubject, Observable, of} from 'rxjs';
import {Attachment} from '../../attachment/attachment.model';
import {map, switchMap} from 'rxjs/operators';
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
import {DialogEditTaskRepeatCfgComponent} from '../../task-repeat-cfg/dialog-edit-task-repeat-cfg/dialog-edit-task-repeat-cfg.component';
import {TaskRepeatCfgService} from '../../task-repeat-cfg/task-repeat-cfg.service';
import {TaskRepeatCfg} from '../../task-repeat-cfg/task-repeat-cfg.model';
import * as moment from 'moment';
import {DialogEditAttachmentComponent} from '../../attachment/dialog-edit-attachment/dialog-edit-attachment.component';
import {taskAdditionalInfoTaskChangeAnimation} from './task-additional-info.ani';
import {noopAnimation} from '../../../ui/animations/noop.ani';
import {TaskAdditionalInfoItemComponent} from './task-additional-info-item/task-additional-info-item.component';

@Component({
  selector: 'task-additional-info',
  templateUrl: './task-additional-info.component.html',
  styleUrls: ['./task-additional-info.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation, fadeAnimation, swirlAnimation, taskAdditionalInfoTaskChangeAnimation, noopAnimation]
})
export class TaskAdditionalInfoComponent implements AfterViewInit, OnDestroy {
  @Output() taskNotesChanged: EventEmitter<string> = new EventEmitter();
  @Output() tabIndexChange: EventEmitter<number> = new EventEmitter();

  @HostBinding('@noop') alwaysTrue = true;

  @ViewChildren(TaskAdditionalInfoItemComponent) itemEls: QueryList<TaskAdditionalInfoItemComponent>;

  selectedItemIndex = 0;
  isFocusNotes = false;
  T = T;
  issueAttachments: Attachment[];
  reminderId$ = new BehaviorSubject(null);
  reminderData$: Observable<ReminderCopy> = this.reminderId$.pipe(
    switchMap(id => id
      ? this._reminderService.getById$(id)
      : of(null)
    ),
  );

  repeatCfgId$ = new BehaviorSubject(null);
  repeatCfgDays$: Observable<string> = this.repeatCfgId$.pipe(
    switchMap(id => (id)
      ? this._taskRepeatCfgService.getTaskRepeatCfgById$(id).pipe(
        map(repeatCfg => {
          if (!repeatCfg) {
            return null;
          }
          const days: (keyof TaskRepeatCfg)[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const localWeekDays = moment.weekdaysMin();
          return days.filter(day => repeatCfg[day])
            .map((day, index) => localWeekDays[days.indexOf(day)])
            .join(', ');
        }),
      )

      : of(null)
    ),
  );


  private _attachmentIds$ = new BehaviorSubject([]);
  localAttachments$: Observable<Attachment[]> = this._attachmentIds$.pipe(
    switchMap((ids) => this.attachmentService.getByIds$(ids))
  );
  private _taskData: TaskWithSubTasks;
  private _focusTimeout: number;

  constructor(
    private _resolver: ComponentFactoryResolver,
    private _issueService: IssueService,
    public taskService: TaskService,
    private _reminderService: ReminderService,
    private _taskRepeatCfgService: TaskRepeatCfgService,
    private  _matDialog: MatDialog,
    public attachmentService: AttachmentService,
  ) {
  }

  @Input() set task(val: TaskWithSubTasks) {
    this._taskData = val;
    this._attachmentIds$.next(this._taskData.attachmentIds);
    this.issueAttachments = this._issueService.getMappedAttachments(this._taskData.issueType, this._taskData.issueData);
    this.reminderId$.next(val.reminderId);
    this.repeatCfgId$.next(val.repeatCfgId);
    this.focusFirst();
  }

  get task(): TaskWithSubTasks {
    return this._taskData;
  }

  get progress() {
    return this._taskData && this._taskData.timeEstimate && (this._taskData.timeSpent / this._taskData.timeEstimate) * 100;
  }

  ngAfterViewInit(): void {
    this.focusFirst();
  }

  ngOnDestroy(): void {
    window.clearTimeout(this._focusTimeout);
  }

  changeTaskNotes($event: string) {
    this.taskNotesChanged.emit($event);
  }


  close() {
    this.taskService.setSelectedId(null);
  }

  updateTaskTitleIfChanged(isChanged: boolean, newTitle: string) {
    if (isChanged) {
      this.taskService.update(this._taskData.id, {title: newTitle});
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

  editTaskRepeatCfg() {
    this._matDialog.open(DialogEditTaskRepeatCfgComponent, {
      restoreFocus: false,
      data: {
        task: this.task,
      }
    });
  }

  addAttachment() {
    this._matDialog
      .open(DialogEditAttachmentComponent, {
        data: {},
      })
      .afterClosed()
      .subscribe(result => {
        if (result) {
          this.attachmentService.addAttachment({
            ...result,
            taskId: this.task.id,
          });
        }
      });
  }

  collapseParent() {
    this.taskService.setSelectedId(null);
  }

  onItemKeyPress(ev: KeyboardEvent) {
    if (ev.key === 'ArrowUp' && this.selectedItemIndex > 0) {
      this.selectedItemIndex--;
      this.itemEls.toArray()[this.selectedItemIndex].focusEl();
    } else if (ev.key === 'ArrowDown' && this.itemEls.toArray().length > (this.selectedItemIndex + 1)) {
      this.selectedItemIndex++;
      this.itemEls.toArray()[this.selectedItemIndex].focusEl();
    }
  }

  private focusFirst() {
    window.clearTimeout(this._focusTimeout);
    this._focusTimeout = window.setTimeout(() => {
      this.itemEls.first.focusEl();
      this.selectedItemIndex = 0;
    }, 150);
  }
}
