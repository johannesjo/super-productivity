import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {
  __updateMultipleTaskSimple,
  addSubTask,
  addTask,
  addTimeSpent,
  convertToMainTask,
  deleteTask,
  deleteTasks,
  moveSubTask,
  moveSubTaskDown,
  moveSubTaskToBottom,
  moveSubTaskToTop,
  moveSubTaskUp,
  moveToArchive_,
  moveToOtherProject,
  removeTagsForAllTasks,
  reScheduleTask,
  restoreTask,
  roundTimeSpentForDay,
  scheduleTask,
  toggleStart,
  toggleTaskShowSubTasks,
  undoDeleteTask,
  unScheduleTask,
  updateTask,
  updateTaskTags,
  updateTaskUi,
} from './task.actions';
import { select, Store } from '@ngrx/store';
import { tap, withLatestFrom } from 'rxjs/operators';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import { selectTaskFeatureState } from './task.selectors';
import { TaskState } from '../task.model';
import { environment } from '../../../../environments/environment';
import { addTaskRepeatCfgToTask } from '../../task-repeat-cfg/store/task-repeat-cfg.actions';
import {
  addTaskAttachment,
  deleteTaskAttachment,
  updateTaskAttachment,
} from '../task-attachment/task-attachment.actions';
import { PlannerActions } from '../../planner/store/planner.actions';
import { deleteProject } from '../../project/store/project.actions';

@Injectable()
export class TaskDbEffects {
  private _actions$ = inject(Actions);
  private _store$ = inject<Store<any>>(Store);
  private _persistenceService = inject(PersistenceService);

  updateTask$: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(
          addTask,
          restoreTask,
          addTimeSpent,
          deleteTask,
          deleteTasks,
          undoDeleteTask,
          addSubTask,
          convertToMainTask,
          // setCurrentTask,
          // unsetCurrentTask,
          updateTask,
          __updateMultipleTaskSimple,
          updateTaskTags,
          removeTagsForAllTasks,
          moveSubTask,
          moveSubTaskUp,
          moveSubTaskDown,
          moveSubTaskToTop,
          moveSubTaskToBottom,
          moveToArchive_,
          moveToOtherProject,
          toggleStart,
          roundTimeSpentForDay,

          // REMINDER
          scheduleTask,
          reScheduleTask,
          unScheduleTask,

          // ATTACHMENT ACTIONS
          addTaskAttachment,
          deleteTaskAttachment,
          updateTaskAttachment,

          // RELATED ACTIONS
          addTaskRepeatCfgToTask,

          // PLANNER
          PlannerActions.transferTask,
          PlannerActions.moveBeforeTask,
          PlannerActions.planTaskForDay,

          // PROJECT
          deleteProject,
        ),
        withLatestFrom(this._store$.pipe(select(selectTaskFeatureState))),
        tap(([, taskState]) => this._saveToLs(taskState, true)),
      ),
    { dispatch: false },
  );

  updateTaskUi$: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(updateTaskUi, toggleTaskShowSubTasks),
        withLatestFrom(this._store$.pipe(select(selectTaskFeatureState))),
        tap(([, taskState]) => this._saveToLs(taskState)),
      ),
    { dispatch: false },
  );

  // @debounce(50)
  private _saveToLs(taskState: TaskState, isSyncModelChange: boolean = false): void {
    this._persistenceService.task.saveState(
      {
        ...taskState,

        // make sure those are never set to something
        selectedTaskId: environment.production ? null : taskState.selectedTaskId,
        currentTaskId: null,
      },
      { isSyncModelChange },
    );
  }
}
