import {createEntityAdapter, EntityAdapter} from '@ngrx/entity';
import {TaskRepeatCfgActions, TaskRepeatCfgActionTypes} from './task-repeat-cfg.actions';
import {TaskRepeatCfg, TaskRepeatCfgState} from '../task-repeat-cfg.model';
import {createFeatureSelector, createSelector} from '@ngrx/store';
import {loadDataComplete} from '../../../root-store/meta/load-data-complete.action';
import {AppDataComplete} from '../../../imex/sync/sync.model';

export const TASK_REPEAT_CFG_FEATURE_NAME = 'taskRepeatCfg';


export const adapter: EntityAdapter<TaskRepeatCfg> = createEntityAdapter<TaskRepeatCfg>();
export const selectTaskRepeatCfgFeatureState = createFeatureSelector<TaskRepeatCfgState>(TASK_REPEAT_CFG_FEATURE_NAME);
export const {selectIds, selectEntities, selectAll, selectTotal} = adapter.getSelectors();
export const selectAllTaskRepeatCfgs = createSelector(selectTaskRepeatCfgFeatureState, selectAll);
export const selectTaskRepeatCfgById = createSelector(
  selectTaskRepeatCfgFeatureState,
  (state, props: { id: string }) => state.entities[props.id]
);


export const initialTaskRepeatCfgState: TaskRepeatCfgState = adapter.getInitialState({
  // additional entity state properties
});

export function taskRepeatCfgReducer(
  state = initialTaskRepeatCfgState,
  action: TaskRepeatCfgActions
): TaskRepeatCfgState {

  // TODO fix this hackyness once we use the new syntax everywhere
  if ((action.type as string) === loadDataComplete.type) {
    const appDataComplete: AppDataComplete = action as any;
    return {...appDataComplete.taskRepeatCfg};
  }

  switch (action.type) {
    case TaskRepeatCfgActionTypes.AddTaskRepeatCfgToTask: {
      return adapter.addOne(action.payload.taskRepeatCfg, state);
    }

    case TaskRepeatCfgActionTypes.UpdateTaskRepeatCfg: {
      return adapter.updateOne(action.payload.taskRepeatCfg, state);
    }

    case TaskRepeatCfgActionTypes.UpdateTaskRepeatCfgs: {
      const {ids, changes} = action.payload;
      return adapter.updateMany(ids.map(id => ({
        id,
        changes,
      })), state);
    }

    case TaskRepeatCfgActionTypes.UpsertTaskRepeatCfg: {
      return adapter.upsertOne(action.payload.taskRepeatCfg, state);
    }

    case TaskRepeatCfgActionTypes.DeleteTaskRepeatCfg: {
      return adapter.removeOne(action.payload.id, state);
    }

    case TaskRepeatCfgActionTypes.DeleteTaskRepeatCfgs: {
      return adapter.removeMany(action.payload.ids, state);
    }

    case TaskRepeatCfgActionTypes.LoadTaskRepeatCfgState:
      return {...action.payload.state};

    default: {
      return state;
    }
  }
}


