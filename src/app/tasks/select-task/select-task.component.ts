import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Task } from '../task.model';
import { map, startWith, takeUntil, withLatestFrom } from 'rxjs/operators';
import { TaskService } from '../task.service';
import { Subject } from 'rxjs';

@Component({
  selector: 'select-task',
  templateUrl: './select-task.component.html',
  styleUrls: ['./select-task.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SelectTaskComponent implements OnInit, OnDestroy {
  taskSelectCtrl: FormControl = new FormControl();
  filteredTasks: Task[];
  private _destroy$: Subject<boolean> = new Subject<boolean>();

  constructor(private _taskService: TaskService) {
  }

  ngOnInit() {
    this.taskSelectCtrl.valueChanges.pipe(
      startWith(''),
      withLatestFrom(this._taskService.startableTasks$),
      map(([str, tasks]) =>
        typeof str === 'string'
          ? tasks.filter(task => task.title.toLowerCase().includes(str.toLowerCase()))
          : tasks
      ),
      takeUntil(this._destroy$)
    )
      .subscribe((filteredTasks) => {
        this.filteredTasks = filteredTasks;
      });
  }

  ngOnDestroy() {
    this._destroy$.next(true);
    this._destroy$.unsubscribe();
  }

  selectTask() {
    this.taskSelectCtrl.setValue('');

  }


  displayWith(task: Task) {
    return task && task.title;
  }
}
