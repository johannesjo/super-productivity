import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { Task } from '../task.model';
import { map, startWith, takeUntil, withLatestFrom } from 'rxjs/operators';
import { Observable, Subject } from 'rxjs';
import { T } from '../../../t.const';
import { WorkContextService } from '../../work-context/work-context.service';
import { Store } from '@ngrx/store';
import {
  selectStartableTasksActiveContextFirst,
  selectTrackableTasksActiveContextFirst,
} from '../../work-context/store/work-context.selectors';
import { Project } from '../../project/project.model';
import { selectAllProjects } from '../../project/store/project.selectors';

@Component({
  selector: 'select-task',
  templateUrl: './select-task.component.html',
  styleUrls: ['./select-task.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectTaskComponent implements OnInit, OnDestroy {
  T: typeof T = T;
  taskSelectCtrl: UntypedFormControl = new UntypedFormControl();
  filteredTasks: Task[] = [];
  projectMap: { [key: string]: Project } = {};
  isCreate: boolean = false;
  @Output() taskChange: EventEmitter<Task | string> = new EventEmitter();
  @Input() isLimitToProject: boolean = false;
  @Input() isIncludeDoneTasks: boolean = false;
  private _destroy$: Subject<boolean> = new Subject<boolean>();

  constructor(
    private _workContextService: WorkContextService,
    private _store: Store,
  ) {}

  @Input() set initialTask(task: Task) {
    if ((task && !this.taskSelectCtrl.value) || this.taskSelectCtrl.value === '') {
      this.isCreate = false;
      this.taskSelectCtrl.setValue(task);
    }
  }

  ngOnInit(): void {
    this._store
      .select(selectAllProjects)
      .pipe(takeUntil(this._destroy$))
      .subscribe((projects) => {
        projects.forEach((project) => {
          this.projectMap[project.id] = project;
        });
      });
    const tasks$: Observable<Task[]> = this.isLimitToProject
      ? this.isIncludeDoneTasks
        ? this._workContextService.trackableTasksForActiveContext$
        : this._workContextService.startableTasksForActiveContext$
      : this.isIncludeDoneTasks
        ? this._store.select(selectTrackableTasksActiveContextFirst)
        : this._store.select(selectStartableTasksActiveContextFirst);

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

  ngOnDestroy(): void {
    this._destroy$.next(true);
    this._destroy$.unsubscribe();
  }

  displayWith(task?: Task): string | undefined {
    // NOTE: apparently task can be undefined for displayWith
    return task?.title;
  }

  trackById(i: number, task: Task): string {
    return task.id;
  }
}
