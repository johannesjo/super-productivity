import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import { TaskService } from '../../../features/tasks/task.service';
import {
  TaskWithReminderData,
  TaskWithSubTasks,
} from '../../../features/tasks/task.model';
import { standardListAnimation } from '../../../ui/animations/standard-list.ani';
import { T } from '../../../t.const';
import { Subject, timer } from 'rxjs';
import { mapTo, switchMap } from 'rxjs/operators';
import { TaskListComponent } from '../../tasks/task-list/task-list.component';
import { FullPageSpinnerComponent } from '../../../ui/full-page-spinner/full-page-spinner.component';
import { AsyncPipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'backlog',
  templateUrl: './backlog.component.html',
  styleUrls: ['./backlog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [standardListAnimation],
  imports: [TaskListComponent, FullPageSpinnerComponent, AsyncPipe, TranslatePipe],
})
export class BacklogComponent implements AfterViewInit {
  taskService = inject(TaskService);

  readonly backlogTasks = input<TaskWithSubTasks[]>([]);

  private _readyTimerDuration$ = new Subject<number>();
  ready$ = this._readyTimerDuration$.pipe(
    switchMap((duration) => timer(duration)),
    mapTo(true),
  );

  readonly closeBacklog = output<any>();

  T: typeof T = T;

  ngAfterViewInit(): void {
    let initialDelay = 0;
    if (this.backlogTasks().length > 99) {
      initialDelay = 700;
    } else if (this.backlogTasks().length > 30) {
      initialDelay = 500;
    } else if (this.backlogTasks().length > 15) {
      initialDelay = 300;
    }
    this._readyTimerDuration$.next(initialDelay);
  }

  trackByFn(i: number, task: TaskWithReminderData): string {
    return task.id;
  }
}
