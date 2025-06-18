import { createAction, props } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { Project } from '../project.model';
import { WorkContextAdvancedCfgKey } from '../../work-context/work-context.model';
import { DropListModelSource } from '../../tasks/task.model';

export const setCurrentProject = createAction(
  '[Project] SetCurrentProject',
  props<any>(),
);

export const loadProjects = createAction(
  '[Project] Load Projects',
  props<{ projects: Project[] }>(),
);

export const addProject = createAction(
  '[Project] Add Project',
  props<{ project: Project }>(),
);

export const upsertProject = createAction(
  '[Project] Upsert Project',
  props<{ project: Project }>(),
);

export const addProjects = createAction(
  '[Project] Add Projects',
  props<{ projects: Project[] }>(),
);

export const updateProject = createAction(
  '[Project] Update Project',
  props<{ project: Update<Project> }>(),
);

export const updateProjectAdvancedCfg = createAction(
  '[Project] Update Project Advanced Cfg',
  props<{
    projectId: string;
    sectionKey: WorkContextAdvancedCfgKey;
    data: any;
  }>(),
);

// export const deleteProjects = createAction(
//   '[Project] Delete Projects',
//   props<{ ids: string[] }>(),
// );

export const updateProjectOrder = createAction(
  '[Project] Update Project Order',
  props<{ ids: string[] }>(),
);

export const archiveProject = createAction(
  '[Project] Archive Project',
  props<{ id: string }>(),
);

export const unarchiveProject = createAction(
  '[Project] Unarchive Project',
  props<{ id: string }>(),
);

export const toggleHideFromMenu = createAction(
  '[Project] Toggle hide from menu',
  props<{ id: string }>(),
);

// MOVE TASK ACTIONS
// -----------------
export const moveProjectTaskToBacklogListAuto = createAction(
  '[Project] Auto Move Task from regular to backlog',
  props<{ taskId: string; projectId: string }>(),
);

export const moveProjectTaskToRegularListAuto = createAction(
  '[Project] Auto Move Task from backlog to regular',
  props<{ taskId: string; projectId: string; isMoveToTop: boolean }>(),
);

export const moveProjectTaskUpInBacklogList = createAction(
  '[Project] Move Task Up in Backlog',
  props<{ taskId: string; workContextId: string; doneBacklogTaskIds: string[] }>(),
);

export const moveProjectTaskDownInBacklogList = createAction(
  '[Project] Move Task Down in Backlog',
  props<{ taskId: string; workContextId: string; doneBacklogTaskIds: string[] }>(),
);

export const moveProjectTaskToTopInBacklogList = createAction(
  '[Project] Move Task to Top in Backlog',
  props<{ taskId: string; workContextId: string; doneBacklogTaskIds: string[] }>(),
);

export const moveProjectTaskToBottomInBacklogList = createAction(
  '[Project] Move Task to Bottom in Backlog',
  props<{ taskId: string; workContextId: string; doneBacklogTaskIds: string[] }>(),
);

export const moveProjectTaskInBacklogList = createAction(
  '[Project] Move Task in Backlog',
  props<{ taskId: string; newOrderedIds: string[]; workContextId: string }>(),
);

export const moveProjectTaskToBacklogList = createAction(
  '[Project] Move Task from regular to backlog',
  props<{ taskId: string; newOrderedIds: string[]; workContextId: string }>(),
);

export const moveProjectTaskToRegularList = createAction(
  '[Project] Move Task from backlog to regular',
  props<{
    taskId: string;
    newOrderedIds: string[];
    workContextId: string;
    src: DropListModelSource;
    target: DropListModelSource;
  }>(),
);

export const moveAllProjectBacklogTasksToRegularList = createAction(
  '[Project] Move all backlog tasks to regular',
  props<{ projectId: string }>(),
);
