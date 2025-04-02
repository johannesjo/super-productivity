import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {
  __updateMultipleTaskSimple,
  addSubTask,
  addTask,
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
  toggleTaskShowSubTasks,
  undoDeleteTask,
  unScheduleTask,
  updateTask,
  updateTaskTags,
  updateTaskUi,
} from './task.actions';
import { select, Store } from '@ngrx/store';
import { auditTime, first, switchMap, tap, withLatestFrom } from 'rxjs/operators';
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
import { PfapiService } from '../../../pfapi/pfapi.service';
import { TimeTrackingActions } from '../../time-tracking/store/time-tracking.actions';
import { TIME_TRACKING_TO_DB_INTERVAL } from '../../../app.constants';

@Injectable()
export class TaskDbEffects {
  private _actions$ = inject(Actions);
  private _store$ = inject<Store<any>>(Store);
  private _pfapiService = inject(PfapiService);

  updateTaskAuditTime$: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(
          // TIME TRACKING
          TimeTrackingActions.addTimeSpent,
        ),
        auditTime(TIME_TRACKING_TO_DB_INTERVAL),
        switchMap(() => this._store$.pipe(select(selectTaskFeatureState), first())),
        tap((taskState) => this._saveToLs(taskState, true)),
      ),
    { dispatch: false },
  );

  updateTask$: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(
          addTask,
          restoreTask,
          deleteTask,
          deleteTasks,
          undoDeleteTask,
          addSubTask,
          convertToMainTask,
          // setCurrentTask,
          // unsetCurrentTask,
          // toggleStart,

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
  private _saveToLs(
    taskState: TaskState,
    isUpdateRevAndLastUpdate: boolean = false,
  ): void {
    this._pfapiService.m.task.save(
      {
        ...taskState,

        // make sure those are never set to something
        selectedTaskId: environment.production ? null : taskState.selectedTaskId,
        currentTaskId: null,
      },
      { isUpdateRevAndLastUpdate },
    );
  }
}
