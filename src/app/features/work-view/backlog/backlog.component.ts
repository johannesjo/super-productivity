import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  input,
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

@Component({
  selector: 'backlog',
  templateUrl: './backlog.component.html',
  styleUrls: ['./backlog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [standardListAnimation],
  standalone: false,
})
export class BacklogComponent implements AfterViewInit {
  readonly backlogTasks = input<TaskWithSubTasks[]>([]);

  private _readyTimerDuration$ = new Subject<number>();
  ready$ = this._readyTimerDuration$.pipe(
    switchMap((duration) => timer(duration)),
    mapTo(true),
  );

  @Output() closeBacklog: EventEmitter<any> = new EventEmitter<any>();

  T: typeof T = T;

  // we do it here to have the tasks in memory all the time
  // backlogTasks$: Observable<TaskWithSubTasks[]> = this._projectService.isProjectChanging$.pipe(
  //   delay(50),
  //   switchMap((isChanging) => isChanging ? of([]) : this.taskService.backlogTasks$),
  //   startWith([])
  // );
  // backlogTasks$: Observable<TaskWithSubTasks[]> = this.taskService.backlogTasks$;

  constructor(public taskService: TaskService) {}

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
