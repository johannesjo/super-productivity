import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectAllTasksWithSubTasksInActiveProjects } from '../tasks/store/task.selectors';
import { map } from 'rxjs/operators';
import { WorkViewComponent } from '../work-view/work-view.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { TaskViewCustomizerService } from '../task-view-customizer/task-view-customizer.service';
import { sortDoneTasksByDoneDate } from '../work-context/work-context.util';

const ALL_TASKS_CONTEXT_KEY = 'ALL_TASKS';

@Component({
  selector: 'all-tasks-page',
  templateUrl: './all-tasks-page.component.html',
  styleUrl: './all-tasks-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [WorkViewComponent],
})
export class AllTasksPageComponent {
  private _store = inject(Store);
  private _customizerService = inject(TaskViewCustomizerService);
  private _destroyRef = inject(DestroyRef);

  constructor() {
    this._customizerService.setContextKeyOverride(ALL_TASKS_CONTEXT_KEY);
    this._destroyRef.onDestroy(() => {
      this._customizerService.setContextKeyOverride(null);
    });
  }

  // Tasks across active projects (archived ones excluded), parents carrying
  // their nested subTasks — the shape <work-view> needs. The flat
  // selectAllTasksInActiveProjects would drop the child rows and the
  // per-subtask estimate.
  undoneTasks = toSignal(
    this._store
      .select(selectAllTasksWithSubTasksInActiveProjects)
      .pipe(map((tasks) => tasks.filter((t) => !t.isDone))),
    { initialValue: [] },
  );

  // Newest-completed first, same ordering every other Done list uses.
  doneTasks = toSignal(
    this._store
      .select(selectAllTasksWithSubTasksInActiveProjects)
      .pipe(map((tasks) => sortDoneTasksByDoneDate(tasks.filter((t) => t.isDone)))),
    { initialValue: [] },
  );
}
