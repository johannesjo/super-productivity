import { ActionReducer } from '@ngrx/store';
import { RootState } from '../root-state';
import { addTask } from '../../features/tasks/store/task.actions';
import { PROJECT_FEATURE_NAME } from '../../features/project/store/project.reducer';
import { TAG_FEATURE_NAME } from '../../features/tag/store/tag.reducer';
import { projectAdapter } from '../../features/project/store/project.reducer';
import { tagAdapter } from '../../features/tag/store/tag.reducer';
import { Tag } from '../../features/tag/tag.model';
import { Project } from '../../features/project/project.model';
import { Update } from '@ngrx/entity';
import { TODAY_TAG } from '../../features/tag/tag.const';
import { getWorklogStr } from '../../util/get-work-log-str';

export const taskSharedMetaReducer = (
  reducer: ActionReducer<any, any>,
): ActionReducer<any, any> => {
  return (state: RootState, action: any) => {
    let updatedState = state;

    switch (action.type) {
      case addTask.type: {
        const actionTyped = action as ReturnType<typeof addTask>;
        const { task, isAddToBottom } = actionTyped;

        // Update project state
        if (
          task.projectId &&
          updatedState[PROJECT_FEATURE_NAME].entities[task.projectId]
        ) {
          const affectedProject = updatedState[PROJECT_FEATURE_NAME].entities[
            task.projectId
          ] as Project;
          const prop: 'backlogTaskIds' | 'taskIds' =
            actionTyped.isAddToBacklog && affectedProject.isEnableBacklog
              ? 'backlogTaskIds'
              : 'taskIds';

          const changes: { [x: string]: any[] } = {};
          if (isAddToBottom) {
            changes[prop] = [...affectedProject[prop], task.id];
          } else {
            changes[prop] = [task.id, ...affectedProject[prop]];
          }

          updatedState = {
            ...updatedState,
            [PROJECT_FEATURE_NAME]: projectAdapter.updateOne(
              {
                id: task.projectId,
                changes,
              },
              updatedState[PROJECT_FEATURE_NAME],
            ),
          };
        }

        // Update tag state
        const tagIdsToUpdate: string[] = [
          ...task.tagIds,
          ...(task.dueDay === getWorklogStr() ? [TODAY_TAG.id] : []),
        ];
        const tagUpdates: Update<Tag>[] = tagIdsToUpdate.map((tagId) => ({
          id: tagId,
          changes: {
            taskIds: isAddToBottom
              ? [
                  ...(updatedState[TAG_FEATURE_NAME].entities[tagId] as Tag).taskIds,
                  task.id,
                ]
              : [
                  task.id,
                  ...(updatedState[TAG_FEATURE_NAME].entities[tagId] as Tag).taskIds,
                ],
          },
        }));

        updatedState = {
          ...updatedState,
          [TAG_FEATURE_NAME]: tagAdapter.updateMany(
            tagUpdates,
            updatedState[TAG_FEATURE_NAME],
          ),
        };

        return reducer(updatedState, action);
      }

      default:
        return reducer(state, action);
    }
  };
};
