import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ComponentFactoryResolver,
  HostBinding,
  Input,
  OnDestroy,
  QueryList,
  ViewChild,
  ViewChildren
} from '@angular/core';
import {TaskAdditionalInfoTargetPanel, TaskWithIssueData, TaskWithSubTasks} from '../task.model';
import {IssueService} from '../../issue/issue.service';
import {AttachmentService} from '../../attachment/attachment.service';
import {BehaviorSubject, Observable, of, Subject, Subscription} from 'rxjs';
import {Attachment, AttachmentCopy} from '../../attachment/attachment.model';
import {delay, distinctUntilChanged, filter, map, shareReplay, switchMap, withLatestFrom} from 'rxjs/operators';
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
import {IssueData, IssueProviderKey} from '../../issue/issue.model';
import {distinctUntilChangedObject} from '../../../util/distinct-until-changed-object';

@Component({
  selector: 'task-additional-info',
  templateUrl: './task-additional-info.component.html',
  styleUrls: ['./task-additional-info.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation, fadeAnimation, swirlAnimation, taskAdditionalInfoTaskChangeAnimation, noopAnimation]
})
export class TaskAdditionalInfoComponent implements AfterViewInit, OnDestroy {
  @HostBinding('@noop') alwaysTrue = true;

  @ViewChildren(TaskAdditionalInfoItemComponent) itemEls: QueryList<TaskAdditionalInfoItemComponent>;
  @ViewChild('attachmentPanelElRef') attachmentPanelElRef: TaskAdditionalInfoItemComponent;

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

  issueIdAndType$ = new Subject<{ id: string | number; type: IssueProviderKey }>();
  issueIdAndTypeShared$ = this.issueIdAndType$.pipe(
    distinctUntilChanged(distinctUntilChangedObject),
    shareReplay(1),
  );

  issueData$: Observable<IssueData> = this.issueIdAndTypeShared$.pipe(
    switchMap(({id, type}) => (id && type)
      ? this._issueService.getById$(type, id)
      : of(null)),
    shareReplay(1),
  );
  issueAttachments$: Observable<AttachmentCopy[]> = this.issueData$.pipe(
    withLatestFrom(this.issueIdAndTypeShared$),
    map(([data, {type}]) => (data && type)
      ? this._issueService.getMappedAttachments(type, data)
      : [])
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
  parentId$ = new BehaviorSubject<string>(null);
  parentTaskData$: Observable<TaskWithIssueData> = this.parentId$.pipe(
    switchMap((id) => id ? this.taskService.getByIdWithIssueData$(id) : of(null))
  );
  private _attachmentIds$ = new BehaviorSubject([]);
  localAttachments$: Observable<Attachment[]> = this._attachmentIds$.pipe(
    switchMap((ids) => this.attachmentService.getByIds$(ids))
  );
  localAttachments: Attachment[];

  private _taskData: TaskWithSubTasks;
  private _focusTimeout: number;
  private _subs = new Subscription();

  constructor(
    private _resolver: ComponentFactoryResolver,
    private _issueService: IssueService,
    public taskService: TaskService,
    private _reminderService: ReminderService,
    private _taskRepeatCfgService: TaskRepeatCfgService,
    private  _matDialog: MatDialog,
    public attachmentService: AttachmentService,
  ) {
    // NOTE: needs to be assigned here before any setter is called
    this._subs.add(this.issueAttachments$.subscribe((attachments) => this.issueAttachments = attachments));
    this._subs.add(this.localAttachments$.subscribe((attachments) => this.localAttachments = attachments));
    // this.issueIdAndTypeShared$.subscribe((v) => console.log('issueIdAndTypeShared$', v));
    // this.issueData$.subscribe((v) => console.log('issueData$', v));
    // this.issueAttachments$.subscribe((v) => console.log('issueAttachments$', v));
  }

  get task(): TaskWithSubTasks {
    return this._taskData;
  }

  @Input() set task(newVal: TaskWithSubTasks) {
    const prev = this._taskData;
    this._taskData = newVal;
    this._attachmentIds$.next(this._taskData.attachmentIds);

    if (!prev || !newVal || (prev.id !== newVal.id)) {
      this._focusFirst();
    }

    if (!prev || prev.issueId !== newVal.issueId) {
      this.issueIdAndType$.next({
        id: newVal.issueId,
        type: newVal.issueType
      });
    }

    if (!prev || prev.issueId !== newVal.issueId) {
      this.reminderId$.next(newVal.reminderId);
    }

    if (!prev || prev.issueId !== newVal.issueId) {
      this.repeatCfgId$.next(newVal.repeatCfgId);
    }

    if (!prev || prev.issueId !== newVal.issueId) {
      this.parentId$.next(newVal.parentId);
    }
  }

  get progress() {
    return this._taskData && this._taskData.timeEstimate && (this._taskData.timeSpent / this._taskData.timeEstimate) * 100;
  }

  ngAfterViewInit(): void {
    this._subs.add(this.taskService.taskAdditionalInfoTargetPanel$.pipe(
      // hacky but we need a minimal delay to make sure selectedTaskId is ready
      delay(50),
      withLatestFrom(this.taskService.selectedTaskId$),
      filter(([, id]) => !!id),
    ).subscribe(([v]) => {
      if (v === TaskAdditionalInfoTargetPanel.Attachments) {
        this.focusItem(this.attachmentPanelElRef);
      } else {
        this._focusFirst();
      }
    }));
  }

  ngOnDestroy(): void {
    window.clearTimeout(this._focusTimeout);
  }

  changeTaskNotes($event: string) {
    this.taskService.update(this.task.id, {notes: $event});
  }


  close() {
    this.taskService.setSelectedId(null);
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
    this.taskService.focusTask(this.task.id);
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

  focusItem(cmpInstance: TaskAdditionalInfoItemComponent, timeoutDuration = 150) {
    window.clearTimeout(this._focusTimeout);
    this._focusTimeout = window.setTimeout(() => {
      const i = this.itemEls.toArray().findIndex(el => el === cmpInstance);
      if (i === -1) {
        this.focusItem(cmpInstance);
      } else {
        this.selectedItemIndex = i;
        cmpInstance.elementRef.nativeElement.focus();
      }
    }, timeoutDuration);
  }

  private _focusFirst() {
    this._focusTimeout = window.setTimeout(() => {
      this.focusItem(this.itemEls.first, 0);
    }, 150);
  }


}
