import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectAllTasksInActiveProjects } from '../tasks/store/task.selectors';
import { map } from 'rxjs/operators';
import { WorkViewComponent } from '../work-view/work-view.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { TaskViewCustomizerService } from '../task-view-customizer/task-view-customizer.service';
import { sortDoneTasksByDoneDate } from '../work-context/work-context.util';
import { TaskWithSubTasks } from '../tasks/task.model';

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

  // selectAllTasksInActiveProjects — как во всех остальных top-level списках:
  // задачи архивных проектов не должны показываться и быть редактируемыми
  // здесь (rev. п.1).
  undoneTasks = toSignal(
    this._store
      .select(selectAllTasksInActiveProjects)
      .pipe(map((tasks) => tasks.filter((t) => !t.isDone && !t.parentId))),
    { initialValue: [] },
  );

  // Newest-completed first, same ordering every other Done list uses. The
  // selector yields the flat TaskCopy shape, so the shared sorter (typed for
  // TaskWithSubTasks) is applied through a structural cast — it only reads
  // `doneOn`.
  doneTasks = toSignal(
    this._store
      .select(selectAllTasksInActiveProjects)
      .pipe(
        map((tasks) =>
          sortDoneTasksByDoneDate(
            tasks.filter((t) => t.isDone && !t.parentId) as unknown as TaskWithSubTasks[],
          ),
        ),
      ),
    { initialValue: [] },
  );
}
