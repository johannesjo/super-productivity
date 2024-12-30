import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  Input,
  OnDestroy,
  OnInit,
  output,
} from '@angular/core';
import { FormsModule, ReactiveFormsModule, UntypedFormControl } from '@angular/forms';
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
import { MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatAutocomplete, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatIcon } from '@angular/material/icon';
import { MatOption } from '@angular/material/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IssueIconPipe } from '../../issue/issue-icon/issue-icon.pipe';
import { TagComponent } from '../../tag/tag/tag.component';

@Component({
  selector: 'select-task',
  templateUrl: './select-task.component.html',
  styleUrls: ['./select-task.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatFormField,
    MatLabel,
    MatInput,
    FormsModule,
    MatAutocompleteTrigger,
    ReactiveFormsModule,
    MatIcon,
    MatSuffix,
    MatAutocomplete,
    MatOption,
    TranslatePipe,
    IssueIconPipe,
    TagComponent,
  ],
})
export class SelectTaskComponent implements OnInit, OnDestroy {
  private _workContextService = inject(WorkContextService);
  private _store = inject(Store);

  T: typeof T = T;
  taskSelectCtrl: UntypedFormControl = new UntypedFormControl();
  filteredTasks: Task[] = [];
  projectMap: { [key: string]: Project } = {};
  isCreate: boolean = false;
  readonly taskChange = output<Task | string>();
  readonly isLimitToProject = input<boolean>(false);
  readonly isIncludeDoneTasks = input<boolean>(false);
  private _destroy$: Subject<boolean> = new Subject<boolean>();

  // TODO: Skipped for migration because:
  //  Accessor inputs cannot be migrated as they are too complex.
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
    const tasks$: Observable<Task[]> = this.isLimitToProject()
      ? this.isIncludeDoneTasks()
        ? this._workContextService.trackableTasksForActiveContext$
        : this._workContextService.startableTasksForActiveContext$
      : this.isIncludeDoneTasks()
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
