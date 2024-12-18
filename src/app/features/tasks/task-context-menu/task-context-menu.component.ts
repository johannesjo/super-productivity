import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  input,
  ViewChild,
} from '@angular/core';
import { IssueModule } from '../../issue/issue.module';
import { TranslateModule } from '@ngx-translate/core';
import { Task, TaskWithSubTasks } from '../task.model';
import { TaskContextMenuInnerComponent } from './task-context-menu-inner/task-context-menu-inner.component';

@Component({
  selector: 'task-context-menu',
  imports: [IssueModule, TranslateModule, TaskContextMenuInnerComponent],
  templateUrl: './task-context-menu.component.html',
  styleUrl: './task-context-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskContextMenuComponent {
  task = input.required<TaskWithSubTasks | Task>();
  isAdvancedControls = input<boolean>(false);

  isShowInner: boolean = false;

  @ViewChild('taskContextMenuInner', {
    static: false,
    read: TaskContextMenuInnerComponent,
  })
  taskContextMenuInner?: TaskContextMenuInnerComponent;

  constructor(private _cd: ChangeDetectorRef) {}

  open(ev: MouseEvent | KeyboardEvent | TouchEvent, isOpenedFromKeyBoard = false): void {
    this.isShowInner = true;
    this._cd.detectChanges();
    this.taskContextMenuInner?.open(ev, isOpenedFromKeyBoard);
  }
}
