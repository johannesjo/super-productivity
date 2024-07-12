import { ChangeDetectionStrategy, Component, EventEmitter, Output } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectAllTasks } from '../../tasks/store/task.selectors';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { TaskCopy } from '../../tasks/task.model';
import { ADD_TASK_PANEL_ID } from '../planner.model';
import { PlannerActions } from '../store/planner.actions';
import { combineLatest, Observable } from 'rxjs';
import { map, startWith, withLatestFrom } from 'rxjs/operators';
import { UntypedFormControl } from '@angular/forms';
import { selectTagFeatureState } from '../../tag/store/tag.reducer';
import { projectSelectors } from '../../project/store/project.selectors';
import { Project } from '../../project/project.model';
import { Tag } from '../../tag/tag.model';
import { selectPlannerState } from '../store/planner.selectors';

@Component({
  selector: 'add-task-panel',
  templateUrl: './add-task-panel.component.html',
  styleUrl: './add-task-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddTaskPanelComponent {
  @Output() closePanel = new EventEmitter<void>();

  ADD_TASK_PANEL = ADD_TASK_PANEL_ID;
  filterValue: string = '';
  allTasks$: Observable<TaskCopy[]> = this._store.select(selectAllTasks);
  taskSuggestionsCtrl: UntypedFormControl = new UntypedFormControl();

  filteredTasks$: Observable<TaskCopy[]> = combineLatest([
    this.taskSuggestionsCtrl.valueChanges.pipe(startWith('')),
    this._store.select(selectPlannerState),
  ]).pipe(
    withLatestFrom(
      this.allTasks$,
      this._store.select(selectTagFeatureState),
      this._store.select(projectSelectors),
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
          task.repeatCfgId === null &&
          !allAddedIds.includes(task.id);
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

  constructor(private _store: Store) {}

  drop(ev: CdkDragDrop<string, string, TaskCopy>): void {
    const t = ev.item.data;

    // TODO scheduled task case
    if (t.reminderId) {
    } else {
      this._store.dispatch(
        PlannerActions.transferTask({
          task: t,
          prevDay: ev.previousContainer.data,
          newDay: ADD_TASK_PANEL_ID,
          targetIndex: ev.currentIndex,
        }),
      );
    }
  }
}