import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { Task } from '../task.model';
import { map, startWith, takeUntil, withLatestFrom } from 'rxjs/operators';
import { Observable, Subject } from 'rxjs';
import { T } from '../../../t.const';
import { WorkContextService } from '../../work-context/work-context.service';
import { TaskService } from '../task.service';

@Component({
  selector: 'select-task',
  templateUrl: './select-task.component.html',
  styleUrls: ['./select-task.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectTaskComponent implements OnInit, OnDestroy {
  T: typeof T = T;
  taskSelectCtrl: FormControl = new FormControl();
  filteredTasks: Task[] = [];
  isCreate: boolean = false;
  @Output() taskChange: EventEmitter<Task | string> = new EventEmitter();
  @Input() isLimitToProject: boolean = false;
  private _destroy$: Subject<boolean> = new Subject<boolean>();

  constructor(
    private _workContextService: WorkContextService,
    private _taskService: TaskService,
  ) {}

  @Input() set initialTask(task: Task) {
    if ((task && !this.taskSelectCtrl.value) || this.taskSelectCtrl.value === '') {
      this.isCreate = false;
      this.taskSelectCtrl.setValue(task);
    }
  }

  ngOnInit() {
    const tasks$: Observable<Task[]> = this.isLimitToProject
      ? this._workContextService.startableTasksForActiveContext$
      : this._taskService.allStartableTasks$;

    this.taskSelectCtrl.valueChanges
      .pipe(
        startWith(''),
        withLatestFrom(tasks$),
        map(([str, tasks]) =>
          typeof str === 'string'
            ? tasks.filter((task) => task.title.toLowerCase().includes(str.toLowerCase()))
            : tasks,
        ),
        takeUntil(this._destroy$),
      )
      .subscribe((filteredTasks) => {
        const taskOrTitle = this.taskSelectCtrl.value;
        this.isCreate = typeof taskOrTitle === 'string';
        this.filteredTasks = this.isCreate ? filteredTasks : [];
        this.taskChange.emit(taskOrTitle);
      });
  }

  ngOnDestroy() {
    this._destroy$.next(true);
    this._destroy$.unsubscribe();
  }

  displayWith(task: Task) {
    return task && task.title;
  }

  trackById(i: number, task: Task) {
    return task.id;
  }
}
