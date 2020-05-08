import {WorkContext, WorkContextType} from '../../work-context/work-context.model';
import {Dictionary, EntityState} from '@ngrx/entity';
import {Task} from '../../tasks/task.model';

export const getCompleteStateForWorkContext = (workContext: WorkContext, taskState: EntityState<Task>, archive: EntityState<Task>): {
  completeStateForWorkContext: EntityState<Task>,
  unarchivedIds: string[]
} => {
  const filterIdsForProject = (state: EntityState<Task>): string[] => (state.ids as string[]).filter(
    id => state.entities[id].projectId === workContext.id
  );
  const filterIdsForTag = (state: EntityState<Task>): string[] => (state.ids as string[]).filter(
    id => state.entities[id].tagIds.includes(workContext.id)
  );

  // const filterIdsForProject = (state: EntityState<Task>): string[] => (state.ids as string[]).filter(
  //   id => !!(state.entities[id].parentId)
  //     ? state.entities[state.entities[id].parentId].projectId === workContext.id
  //     : state.entities[id].projectId === workContext.id
  // );
  // const filterIdsForTag = (state: EntityState<Task>): string[] => (state.ids as string[]).filter(
  //   id => !!(state.entities[id].parentId)
  //     ? state.entities[state.entities[id].parentId].tagIds.includes(workContext.id)
  //     : state.entities[id].tagIds.includes(workContext.id)
  // );

  const unarchivedIds: string[] = (workContext.type === WorkContextType.TAG)
    ? filterIdsForTag(taskState)
    : filterIdsForProject(taskState);
  const archivedIdsForTag: string[] = (workContext.type === WorkContextType.TAG)
    ? filterIdsForTag(archive)
    : filterIdsForProject(archive);


  const unarchivedEntities = _limitStateToIds(taskState, unarchivedIds);
  const archivedEntities = _limitStateToIds(archive, archivedIdsForTag);

  return {
    completeStateForWorkContext: {
      ids: [...unarchivedIds, ...archivedIdsForTag],
      entities: {
        ...unarchivedEntities,
        ...archivedEntities,
      },
    },
    unarchivedIds,
  };
};


const _limitStateToIds = (stateIn: EntityState<Task>, ids: string[]): Dictionary<Task> => {
  const newState = {};
  ids.forEach(id => {
    newState[id] = stateIn.entities[id];
  });
  return newState;
  // might be prettier, but is much much much much slower
  // return ids.reduce((acc, id) => ({
  //   ...acc,
  //   [id]: stateIn.entities[id]
  // }), {});
};
