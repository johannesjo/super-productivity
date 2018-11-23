import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ComponentFactory,
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
export class TaskAdditionalInfoComponent implements AfterViewInit {
  issueAttachments: Attachment[];
  localAttachments$: Observable<Attachment[]>;
  taskData: TaskWithSubTasks;
  @Input() selectedIndex: number;
  @Output() onTaskAdditionalInfoOpenChanged: EventEmitter<string> = new EventEmitter();
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

  ngAfterViewInit() {
    if (this.taskData.issueData && this.taskData.issueType) {
      this._loadIssueTemplates(this.taskData);
    }
  }

  changeTaskNotes($event) {
    this.onTaskAdditionalInfoOpenChanged.emit($event);
  }

  private _loadIssueTemplates(task: TaskWithSubTasks) {
    this._issueContentRef = this._renderComponent(
      this._issueService.getTabContent(task.issueType),
      this.issueContentEl,
      task
    );

    this._issueHeaderRef = this._renderComponent(
      this._issueService.getTabHeader(task.issueType),
      this.issueHeaderEl,
      task
    );
  }

  private _renderComponent(componentToRender, targetEl, task: TaskWithSubTasks) {
    if (componentToRender) {
      const factory: ComponentFactory<any> = this._resolver.resolveComponentFactory(componentToRender);
      const ref = targetEl.createComponent(factory);
      ref.instance.task = task;
      return ref;
    }
  }
}
