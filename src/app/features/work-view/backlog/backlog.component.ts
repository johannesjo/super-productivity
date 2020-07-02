import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { TaskService } from '../../../features/tasks/task.service';
import { TaskWithReminderData, TaskWithSubTasks } from '../../../features/tasks/task.model';
import { standardListAnimation } from '../../../ui/animations/standard-list.ani';
import { T } from '../../../t.const';
import { ProjectService } from '../../../features/project/project.service';

@Component({
  selector: 'backlog',
  templateUrl: './backlog.component.html',
  styleUrls: ['./backlog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [standardListAnimation]
})
export class BacklogComponent {
  @Input() backlogTasks: TaskWithSubTasks[];

  @Output() closeBacklog: EventEmitter<any> = new EventEmitter<any>();

  T: any = T;

  // we do it here to have the tasks in memory all the time
  // backlogTasks$: Observable<TaskWithSubTasks[]> = this._projectService.isProjectChanging$.pipe(
  //   delay(50),
  //   switchMap((isChanging) => isChanging ? of([]) : this.taskService.backlogTasks$),
  //   startWith([])
  // );
  // backlogTasks$: Observable<TaskWithSubTasks[]> = this.taskService.backlogTasks$;

  constructor(
    public taskService: TaskService,
    private _projectService: ProjectService,
  ) {
  }

  trackByFn(i: number, task: TaskWithReminderData) {
    return task.id;
  }

  removeReminder(task: TaskWithReminderData) {
    this.taskService.removeReminder(task.id, task.reminderId);
  }

}
