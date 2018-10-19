import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { Input } from '@angular/core';
import { Output } from '@angular/core';
import { EventEmitter } from '@angular/core';
import { ViewChild } from '@angular/core';
import { ComponentFactory } from '@angular/core';
import { ComponentFactoryResolver } from '@angular/core';
import { ViewContainerRef } from '@angular/core';
import { AfterViewInit } from '@angular/core';
import { TaskWithAllData } from '../task.model';
import { IssueService } from '../../issue/issue.service';

@Component({
  selector: 'task-additional-info',
  templateUrl: './task-additional-info.component.html',
  styleUrls: ['./task-additional-info.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskAdditionalInfoComponent implements OnInit, AfterViewInit {
  @Input() task: TaskWithAllData;

  @Output() onTaskNotesChanged: EventEmitter<string> = new EventEmitter();
  @ViewChild('issueHeader', {read: ViewContainerRef}) issueHeaderEl: ViewContainerRef;
  @ViewChild('issueContent', {read: ViewContainerRef}) issueContentEl: ViewContainerRef;

  constructor(private _resolver: ComponentFactoryResolver,
              private _issueService: IssueService) {
  }

  ngOnInit() {

  }

  ngAfterViewInit() {
    if (this.task.issueData && this.task.issueType) {
      this._loadIssueTemplates(this.task);
    }
  }

  changeTaskNotes($event) {
    this.onTaskNotesChanged.emit($event);
  }

  private _loadIssueTemplates(task: TaskWithAllData) {
    this._renderComponent(
      this._issueService.getTabContent(task.issueType),
      this.issueContentEl,
      task
    );

    this._renderComponent(
      this._issueService.getTabHeader(task.issueType),
      this.issueHeaderEl,
      task
    );
  }

  private _renderComponent(componentToRender, targetEl, task: TaskWithAllData) {
    if (componentToRender) {
      const factory: ComponentFactory<any> = this._resolver.resolveComponentFactory(componentToRender);
      const ref = targetEl.createComponent(factory);
      ref.instance.task = task;
    }
  }
}
