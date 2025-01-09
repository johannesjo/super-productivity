import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectAllTasks } from '../../tasks/store/task.selectors';
import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { TaskCopy } from '../../tasks/task.model';
import { ADD_TASK_PANEL_ID } from '../planner.model';
import { PlannerActions } from '../store/planner.actions';
import { combineLatest, Observable } from 'rxjs';
import { map, startWith, withLatestFrom } from 'rxjs/operators';
import { FormsModule, ReactiveFormsModule, UntypedFormControl } from '@angular/forms';
import { selectTagFeatureState } from '../../tag/store/tag.reducer';
import { selectProjectFeatureState } from '../../project/store/project.selectors';
import { Project } from '../../project/project.model';
import { Tag } from '../../tag/tag.model';
import { selectPlannerState } from '../store/planner.selectors';
import { TaskService } from '../../tasks/task.service';
import { PlannerService } from '../planner.service';
import { T } from 'src/app/t.const';
import { DateService } from '../../../core/date/date.service';
import { TODAY_TAG } from '../../tag/tag.const';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { PlannerTaskComponent } from '../planner-task/planner-task.component';
import { AsyncPipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'add-task-panel-planner',
  templateUrl: './add-task-panel-planner.component.html',
  styleUrl: './add-task-panel-planner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatIconButton,
    MatIcon,
    FormsModule,
    ReactiveFormsModule,
    CdkDropList,
    PlannerTaskComponent,
    CdkDrag,
    AsyncPipe,
    TranslatePipe,
  ],
})
export class AddTaskPanelPlannerComponent {
  private _store = inject(Store);
  private _taskService = inject(TaskService);
  private _plannerPlanViewService = inject(PlannerService);
  private _dateService = inject(DateService);

  T: typeof T = T;
  readonly closePanel = output<void>();

  ADD_TASK_PANEL = ADD_TASK_PANEL_ID;
  filterValue: string = '';
  allTasks$: Observable<TaskCopy[]> = this._store.select(selectAllTasks);
  taskSuggestionsCtrl: UntypedFormControl = new UntypedFormControl();

  filteredTasks$: Observable<TaskCopy[]> = combineLatest([
    this.taskSuggestionsCtrl.valueChanges.pipe(startWith('')),
    this._store.select(selectPlannerState),
    // NOTE: needed as trigger only
    this._plannerPlanViewService.allScheduledTasks$,
  ]).pipe(
    withLatestFrom(
      this.allTasks$,
      this._store.select(selectTagFeatureState),
      this._store.select(selectProjectFeatureState),
    ),
    map(([[value, plannerState], tasks, tagFeatureState, projectFeatureState]) => {
      const lcv = value.toLowerCase();

      const allAddedIds = Object.keys(plannerState.days)
        .filter((day) => day !== ADD_TASK_PANEL_ID)
        .map((day) => plannerState.days[day])
        .flat();

      return tasks.filter((task) => {
        const isViableTask = // pre filters
          !task.plannedAt &&
          !task.isDone &&
          !task.tagIds.includes(TODAY_TAG.id) &&
          task.repeatCfgId === null &&
          !allAddedIds.includes(task.id) &&
          // don't show sub-tasks if parent is sorted
          !(task.parentId && allAddedIds.includes(task.parentId)) &&
          // don't show parent if sub-tasks are sorted
          !task.subTaskIds.find((sid) => allAddedIds.includes(sid));
        // NOTE unfortunately prettier gets this wrong, so we need to split it up
        if (!isViableTask) {
          return false;
        }

        return (
          // filter by input
          task.title.toLowerCase().includes(lcv) ||
          task.notes?.toLowerCase().includes(lcv) ||
          (task.projectId &&
            (projectFeatureState.entities[task.projectId] as Project)?.title
              .toLowerCase()
              .includes(lcv)) ||
          task.tagIds.find((tagId) =>
            (tagFeatureState.entities[tagId] as Tag).title.toLowerCase().includes(lcv),
          )
        );
      });
    }),
  );

  drop(ev: CdkDragDrop<string, string, TaskCopy>): void {
    const t = ev.item.data;

    // do nothing on self drop
    if (ev.previousContainer === ev.container) {
      return;
    }

    // TODO scheduled task case
    if (t.reminderId && t.plannedAt) {
      this._taskService.unScheduleTask(t.id, t.reminderId);
    } else {
      this._store.dispatch(
        PlannerActions.transferTask({
          task: t,
          prevDay: ev.previousContainer.data,
          newDay: ADD_TASK_PANEL_ID,
          targetIndex: ev.currentIndex,
          today: this._dateService.todayStr(),
        }),
      );
    }
  }
}
