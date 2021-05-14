import { createFeatureSelector, createSelector } from '@ngrx/store';
import { WorkContext, WorkContextState, WorkContextType } from '../work-context.model';
import {
  selectProjectById,
  selectProjectFeatureState,
} from '../../project/store/project.reducer';
import { selectTagById, selectTagFeatureState } from '../../tag/store/tag.reducer';
import { selectTaskEntities } from '../../tasks/store/task.selectors';
import { Task } from '../../tasks/task.model';
import { devError } from '../../../util/dev-error';

export const WORK_CONTEXT_FEATURE_NAME = 'context';

export const selectContextFeatureState = createFeatureSelector<WorkContextState>(
  WORK_CONTEXT_FEATURE_NAME,
);
export const selectActiveContextId = createSelector(
  selectContextFeatureState,
  (state) => state.activeId,
);
export const selectActiveContextType = createSelector(
  selectContextFeatureState,
  (state) => state.activeType,
);
export const selectActiveContextTypeAndId = createSelector(
  selectContextFeatureState,
  (
    state: WorkContextState,
  ): {
    activeId: string;
    activeType: WorkContextType;
    // additional entities state properties
  } => ({
    activeType: state.activeType as WorkContextType,
    activeId: state.activeId as string,
  }),
);

export const selectActiveWorkContext = createSelector(
  selectActiveContextTypeAndId,
  selectProjectFeatureState,
  selectTagFeatureState,
  ({ activeId, activeType }, projectState, tagState): WorkContext => {
    if (activeType === WorkContextType.TAG) {
      const tag = selectTagById.projector(tagState, { id: activeId });
      return {
        ...tag,
        type: WorkContextType.TAG,
        routerLink: `tag/${tag.id}`,
      };
    }
    if (activeType === WorkContextType.PROJECT) {
      const project = selectProjectById.projector(projectState, { id: activeId });
      return {
        ...project,
        icon: null,
        taskIds: project.taskIds || [],
        backlogTaskIds: project.backlogTaskIds || [],
        type: WorkContextType.PROJECT,
        routerLink: `project/${project.id}`,
      };
    }
    throw new Error(
      'Unable to select active work context: ' + activeType + ' ' + activeId,
    );
  },
);

export const selectStartableTasksForActiveContext = createSelector(
  selectActiveWorkContext,
  selectTaskEntities,
  (activeContext, entities): Task[] => {
    let startableTasks: Task[] = [];
    activeContext.taskIds.forEach((id) => {
      const task: Task | undefined = entities[id];
      if (!task) {
        // NOTE: there is the rare chance that activeWorkContext$ and selectTaskEntities
        // are out of sync, due to activeWorkContext taking an extra step, this is why we
        // only use devError
        devError('Task not found');
      } else if (task.subTaskIds && task.subTaskIds.length) {
        startableTasks = startableTasks.concat(
          task.subTaskIds.map((sid) => entities[sid] as Task),
        );
      } else {
        startableTasks.push(task);
      }
    });
    return startableTasks.filter((task) => !task.isDone);
  },
);
