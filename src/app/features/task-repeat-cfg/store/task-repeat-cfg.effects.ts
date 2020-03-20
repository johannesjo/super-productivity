import {Injectable} from '@angular/core';
import {Actions, Effect, ofType} from '@ngrx/effects';
import {concatMap, filter, flatMap, map, take, tap, withLatestFrom} from 'rxjs/operators';
import {select, Store} from '@ngrx/store';
import {
  AddTaskRepeatCfgToTask,
  DeleteTaskRepeatCfg,
  TaskRepeatCfgActionTypes,
  UpdateTaskRepeatCfg
} from './task-repeat-cfg.actions';
import {selectTaskRepeatCfgFeatureState} from './task-repeat-cfg.reducer';
import {PersistenceService} from '../../../core/persistence/persistence.service';
import {Task, TaskArchive, TaskWithSubTasks} from '../../tasks/task.model';
import {AddTask, MoveToArchive, RemoveTaskReminder, UpdateTask} from '../../tasks/store/task.actions';
import {TaskService} from '../../tasks/task.service';
import {TaskRepeatCfgService} from '../task-repeat-cfg.service';
import {TASK_REPEAT_WEEKDAY_MAP, TaskRepeatCfg} from '../task-repeat-cfg.model';
import {from} from 'rxjs';
import {isToday} from './is-created-today.util';
import {ProjectService} from '../../project/project.service';
import {WorkContextService} from '../../work-context/work-context.service';
import {setActiveWorkContext} from '../../work-context/store/work-context.actions';

@Injectable()
export class TaskRepeatCfgEffects {

  @Effect({dispatch: false}) updateTaskRepeatCfgs$: any = this._actions$
    .pipe(
      ofType(
        TaskRepeatCfgActionTypes.AddTaskRepeatCfgToTask,
        TaskRepeatCfgActionTypes.UpdateTaskRepeatCfg,
        TaskRepeatCfgActionTypes.UpsertTaskRepeatCfg,
        TaskRepeatCfgActionTypes.DeleteTaskRepeatCfg,
        TaskRepeatCfgActionTypes.DeleteTaskRepeatCfgs,
      ),
      withLatestFrom(
        this._projectService.currentId$,
        this._store$.pipe(select(selectTaskRepeatCfgFeatureState)),
      ),
      tap(this._saveToLs.bind(this))
    );


  @Effect() createRepeatableTasks: any = this._actions$
    .pipe(
      ofType(setActiveWorkContext),
      withLatestFrom(
        this._taskRepeatCfgService.taskRepeatCfgs$,
      ),
      map(([a, taskRepeatCfgs]): TaskRepeatCfg[] => {
        const day = new Date().getDay();
        const dayStr: keyof TaskRepeatCfg = TASK_REPEAT_WEEKDAY_MAP[day];
        return taskRepeatCfgs && taskRepeatCfgs.filter(
          (taskRepeatCfg: TaskRepeatCfg) =>
            (taskRepeatCfg[dayStr] && !isToday(taskRepeatCfg.lastTaskCreation))
        );
      }),
      filter((taskRepeatCfgs) => taskRepeatCfgs && !!taskRepeatCfgs.length),
      flatMap(taskRepeatCfgs => from(taskRepeatCfgs).pipe(
        flatMap((taskRepeatCfg: TaskRepeatCfg) =>
          this._taskService.getTasksWithSubTasksByRepeatCfgId$(taskRepeatCfg.id).pipe(
            take(1),
            map((tasks): [TaskRepeatCfg, TaskWithSubTasks[]] => [taskRepeatCfg, tasks]),
          )
        )
      )),
      concatMap(([taskRepeatCfg, tasks]) => {
        let isCreateNew = true;
        const actions = [];

        tasks.forEach(task => {
          if (isToday(task.created)) {
            actions.push(new MoveToArchive({tasks: [task]}));
          } else {
            isCreateNew = false;
          }
        });

        if (isCreateNew) {
          actions.push(new AddTask({
            task: this._taskService.createNewTaskWithDefaults(taskRepeatCfg.title, {
              repeatCfgId: taskRepeatCfg.id,
              timeEstimate: taskRepeatCfg.defaultEstimate,
            }),
            workContextType: this._workContextService.activeWorkContextType,
            workContextId: this._workContextService.activeWorkContextId,
            isAddToBacklog: false,
            isAddToBottom: false,
          }));
          actions.push(new UpdateTaskRepeatCfg({
            taskRepeatCfg: {
              id: taskRepeatCfg.id,
              changes: {
                lastTaskCreation: Date.now(),
              }
            }
          }));
        }

        return from(actions);
      }),
      // tap(a => console.log(a)),
    );


  @Effect() removeConfigIdFromTaskStateTasks$: any = this._actions$
    .pipe(
      ofType(
        TaskRepeatCfgActionTypes.DeleteTaskRepeatCfg,
      ),
      concatMap((action: DeleteTaskRepeatCfg) =>
        this._taskService.getTasksByRepeatCfgId$(action.payload.id).pipe(
          take(1)
        ),
      ),
      filter(tasks => tasks && !!tasks.length),
      flatMap((tasks: Task[]) => tasks.map(task => new UpdateTask({
        task: {
          id: task.id,
          changes: {repeatCfgId: null}
        }
      }))),
    );

  @Effect({dispatch: false}) removeConfigIdFromTaskArchiveTasks$: any = this._actions$
    .pipe(
      ofType(
        TaskRepeatCfgActionTypes.DeleteTaskRepeatCfg,
      ),
      tap(([a]: [DeleteTaskRepeatCfg]) => {
        this._removeRepeatCfgFromArchiveTasks.bind(this)(a.payload.id);
      }),
    );

  @Effect() removeRemindersOnCreation$: any = this._actions$
    .pipe(
      ofType(
        TaskRepeatCfgActionTypes.AddTaskRepeatCfgToTask,
      ),
      concatMap((a: AddTaskRepeatCfgToTask) => this._taskService.getById$(a.payload.taskId).pipe(take(1))),
      filter((task: TaskWithSubTasks) => typeof task.reminderId === 'string'),
      map((task: TaskWithSubTasks) => new RemoveTaskReminder({
        id: task.id,
        reminderId: task.reminderId
      })),
    );


  constructor(
    private _actions$: Actions,
    private _taskService: TaskService,
    private _projectService: ProjectService,
    private _store$: Store<any>,
    private _persistenceService: PersistenceService,
    private _workContextService: WorkContextService,
    private _taskRepeatCfgService: TaskRepeatCfgService,
  ) {
  }

  private _saveToLs([action, currentProjectId, taskRepeatCfgState]) {
    if (currentProjectId) {
      this._persistenceService.saveLastActive();
      this._persistenceService.taskRepeatCfg.saveState(taskRepeatCfgState);
    } else {
      throw new Error('No current project id');
    }
  }

  private _removeRepeatCfgFromArchiveTasks(repeatConfigId: string) {
    this._persistenceService.taskArchive.loadState().then((taskArchive: TaskArchive) => {
      // if not yet initialized for project
      if (!taskArchive) {
        return;
      }

      const newState = {...taskArchive};
      const ids = newState.ids as string[];

      const tasksWithRepeatCfgId = ids.map(id => newState.entities[id])
        .filter((task: TaskWithSubTasks) => task.repeatCfgId === repeatConfigId);

      if (tasksWithRepeatCfgId && tasksWithRepeatCfgId.length) {
        tasksWithRepeatCfgId.forEach((task: any) => task.repeatCfgId = null);
        this._persistenceService.taskArchive.saveState(newState);
      }
    });
  }

}
