import { ChangeDetectionStrategy, Component, input, ViewChild } from '@angular/core';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { IssueModule } from '../../issue/issue.module';
import { MatIcon } from '@angular/material/icon';
import {
  MatMenu,
  MatMenuContent,
  MatMenuItem,
  MatMenuTrigger,
} from '@angular/material/menu';
import { TranslateModule } from '@ngx-translate/core';
import { Task, TaskWithSubTasks } from '../task.model';
import { TaskContextMenuInnerComponent } from './task-context-menu-inner/task-context-menu-inner.component';

@Component({
  selector: 'task-context-menu',
  standalone: true,
  imports: [
    AsyncPipe,
    IssueModule,
    MatIcon,
    MatMenu,
    MatMenuContent,
    MatMenuItem,
    NgForOf,
    TranslateModule,
    MatMenuTrigger,
    NgIf,
    TaskContextMenuInnerComponent,
  ],
  templateUrl: './task-context-menu.component.html',
  styleUrl: './task-context-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskContextMenuComponent {
  task = input.required<TaskWithSubTasks | Task>();
  isAdvancedControls = input<boolean>(false);
  isShowInner: boolean = true;

  @ViewChild('taskContextMenuInner', {
    static: false,
    read: TaskContextMenuInnerComponent,
  })
  taskContextMenuInner?: TaskContextMenuInnerComponent;

  open(ev: MouseEvent | KeyboardEvent | TouchEvent): void {
    this.isShowInner = true;
    this.taskContextMenuInner?.open(ev);
  }
}
