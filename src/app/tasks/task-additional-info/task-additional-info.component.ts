import {
  ChangeDetectionStrategy,
  Component,
  ComponentFactoryResolver,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  ViewContainerRef
} from '@angular/core';
import { TaskWithSubTasks } from '../task.model';
import { IssueService } from '../../issue/issue.service';
import { AttachmentService } from '../attachment/attachment.service';
import { Observable } from 'rxjs';
import { Attachment } from '../attachment/attachment.model';

@Component({
  selector: 'task-additional-info',
  templateUrl: './task-additional-info.component.html',
  styleUrls: ['./task-additional-info.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskAdditionalInfoComponent {
  issueAttachments: Attachment[];
  localAttachments$: Observable<Attachment[]>;
  taskData: TaskWithSubTasks;
  @Input() selectedIndex = 0;
  @Output() taskNotesChanged: EventEmitter<string> = new EventEmitter();
  @Output() tabIndexChange: EventEmitter<number> = new EventEmitter();
  @ViewChild('issueHeader', {read: ViewContainerRef}) issueHeaderEl: ViewContainerRef;
  @ViewChild('issueContent', {read: ViewContainerRef}) issueContentEl: ViewContainerRef;
  private _issueHeaderRef;
  private _issueContentRef;

  constructor(
    private _resolver: ComponentFactoryResolver,
    private _issueService: IssueService,
    public attachmentService: AttachmentService,
  ) {
  }

  @Input() set task(val: TaskWithSubTasks) {
    this.taskData = val;

    if (this._issueHeaderRef) {
      this._issueHeaderRef.instance.task = val;
    }
    if (this._issueContentRef) {
      this._issueContentRef.instance.task = val;
    }
    this.localAttachments$ = this.attachmentService.getByIds(this.taskData.attachmentIds);
    this.issueAttachments = this._issueService.getMappedAttachments(this.taskData.issueType, this.taskData.issueData);
  }

  changeTaskNotes($event: string) {
    this.taskNotesChanged.emit($event);
  }

  indexChange($event: number) {
    this.tabIndexChange.emit($event);
  }
}
