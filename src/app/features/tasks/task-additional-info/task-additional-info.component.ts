import {ChangeDetectionStrategy, Component, ComponentFactoryResolver, EventEmitter, Input, Output} from '@angular/core';
import {TaskWithSubTasks, ShowSubTasksMode} from '../task.model';
import {IssueService} from '../../issue/issue.service';
import {AttachmentService} from '../../attachment/attachment.service';
import {BehaviorSubject, Observable} from 'rxjs';
import {Attachment} from '../../attachment/attachment.model';
import {switchMap} from 'rxjs/operators';
import {T} from '../../../t.const';
import {TaskService} from '../task.service';
import {expandAnimation} from '../../../ui/animations/expand.ani';
import {fadeAnimation} from '../../../ui/animations/fade.ani';
import {swirlAnimation} from '../../../ui/animations/swirl-in-out.ani';

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
    public attachmentService: AttachmentService,
  ) {
  }

  @Input() set task(val: TaskWithSubTasks) {
    this.taskData = val;
    this._attachmentIds$.next(this.taskData.attachmentIds);
    this.issueAttachments = this._issueService.getMappedAttachments(this.taskData.issueType, this.taskData.issueData);
  }

  changeTaskNotes($event: string) {
    this.taskNotesChanged.emit($event);
  }

  indexChange($event: number) {
    this.tabIndexChange.emit($event);
  }

  close() {
    this._taskService.setSelectedId(null);
  }


  toggleSubTaskMode() {
    this._taskService.toggleSubTaskMode(this.task.id, true, true);
  }
}
