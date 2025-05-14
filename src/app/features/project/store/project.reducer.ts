import { createEntityAdapter, EntityAdapter, Update } from '@ngrx/entity';
import { Project, ProjectState } from '../project.model';
import { createReducer, on } from '@ngrx/store';
import {
  WorkContextAdvancedCfg,
  WorkContextType,
} from '../../work-context/work-context.model';
import {
  addTask,
  convertToMainTask,
  deleteTask,
  moveToArchive_,
  moveToOtherProject,
  restoreTask,
} from '../../tasks/store/task.actions';
import {
  moveTaskDownInTodayList,
  moveTaskInTodayList,
  moveTaskToBottomInTodayList,
  moveTaskToTopInTodayList,
  moveTaskUpInTodayList,
} from '../../work-context/store/work-context-meta.actions';
import {
  moveItemInList,
  moveTaskForWorkContextLikeState,
} from '../../work-context/store/work-context-meta.helper';
import {
  arrayMoveLeftUntil,
  arrayMoveRightUntil,
  arrayMoveToEnd,
  arrayMoveToStart,
} from '../../../util/array-move';
import { filterOutId } from '../../../util/filter-out-id';
import { unique } from '../../../util/unique';

import { loadAllData } from '../../../root-store/meta/load-all-data.action';
import { migrateProjectState } from '../migrate-projects-state.util';
import { MODEL_VERSION_KEY } from '../../../app.constants';
import { Task } from '../../tasks/task.model';
import { devError } from '../../../util/dev-error';
import {
  addProject,
  addProjects,
  archiveProject,
  deleteProject,
  loadProjects,
  moveAllProjectBacklogTasksToRegularList,
  moveProjectTaskDownInBacklogList,
  moveProjectTaskInBacklogList,
  moveProjectTaskToBacklogList,
  moveProjectTaskToBacklogListAuto,
  moveProjectTaskToBottomInBacklogList,
  moveProjectTaskToRegularList,
  moveProjectTaskToRegularListAuto,
  moveProjectTaskToTopInBacklogList,
  moveProjectTaskUpInBacklogList,
  toggleHideFromMenu,
  unarchiveProject,
  updateProject,
  updateProjectAdvancedCfg,
  updateProjectOrder,
  upsertProject,
} from './project.actions';
import {
  addNote,
  deleteNote,
  moveNoteToOtherProject,
  updateNoteOrder,
} from '../../note/store/note.actions';
import { MODEL_VERSION } from '../../../core/model-version';
import { INBOX_PROJECT } from '../project.const';

export const PROJECT_FEATURE_NAME = 'projects';
const WORK_CONTEXT_TYPE: WorkContextType = WorkContextType.PROJECT;

export const projectAdapter: EntityAdapter<Project> = createEntityAdapter<Project>();

// DEFAULT
// -------
const _addInboxProjectIfNecessary = (state: ProjectState): ProjectState => {
  if (state.ids && !(state.ids as string[]).includes(INBOX_PROJECT.id)) {
    state = {
      ...state,
      ids: [INBOX_PROJECT.id, ...state.ids] as string[],
      entities: {
        ...state.entities,
        [INBOX_PROJECT.id]: INBOX_PROJECT,
      },
    };
  }

  return state;
};

export const initialProjectState: ProjectState = _addInboxProjectIfNecessary(
  projectAdapter.getInitialState({
    ids: [],
    entities: {},
    [MODEL_VERSION_KEY]: MODEL_VERSION.PROJECT,
  }),
);

export const projectReducer = createReducer<ProjectState>(
  initialProjectState,

  // META ACTIONS
  // ------------
  on(loadAllData, (oldState, { appDataComplete }) =>
    _addInboxProjectIfNecessary(
      appDataComplete.project
        ? migrateProjectState({ ...appDataComplete.project })
        : oldState,
    ),
  ),

  on(
    moveTaskInTodayList,
    (state, { taskId, newOrderedIds, target, workContextType, workContextId }) => {
      if (workContextType !== WORK_CONTEXT_TYPE) {
        return state;
      }

      const taskIdsBefore = (state.entities[workContextId] as Project).taskIds;
      const taskIds = moveTaskForWorkContextLikeState(
        taskId,
        newOrderedIds,
        target,
        taskIdsBefore,
      );
      return projectAdapter.updateOne(
        {
          id: workContextId,
          changes: {
            taskIds,
          },
        },
        state,
      );
    },
  ),

  on(moveProjectTaskInBacklogList, (state, { taskId, newOrderedIds, workContextId }) => {
    const taskIdsBefore = (state.entities[workContextId] as Project).backlogTaskIds;
    const backlogTaskIds = moveTaskForWorkContextLikeState(
      taskId,
      newOrderedIds,
      null,
      taskIdsBefore,
    );
    return projectAdapter.updateOne(
      {
        id: workContextId,
        changes: {
          backlogTaskIds,
        },
      },
      state,
    );
  }),

  // Project Actions
  // ------------
  on(addProject, (state, { project }) => projectAdapter.addOne(project, state)),
  on(upsertProject, (state, { project }) => projectAdapter.upsertOne(project, state)),
  on(addProjects, (state, { projects }) => projectAdapter.addMany(projects, state)),

  on(updateProject, (state, { project }) => projectAdapter.updateOne(project, state)),

  on(deleteProject, (state, { project }) => projectAdapter.removeOne(project.id, state)),
  // on(deleteProjects, (state, { ids }) => projectAdapter.removeMany(ids, state)),
  on(loadProjects, (state, { projects }) => projectAdapter.setAll(projects, state)),

  on(toggleHideFromMenu, (state, { id }) =>
    projectAdapter.updateOne(
      {
        id,
        changes: {
          isHiddenFromMenu: !(state.entities[id] as Project).isHiddenFromMenu,
        },
      },
      state,
    ),
  ),

  on(archiveProject, (state, { id }) =>
    projectAdapter.updateOne(
      {
        id,
        changes: {
          isArchived: true,
        },
      },
      state,
    ),
  ),

  on(unarchiveProject, (state, { id }) =>
    projectAdapter.updateOne(
      {
        id,
        changes: {
          isArchived: false,
        },
      },
      state,
    ),
  ),

  on(updateProjectAdvancedCfg, (state, { projectId, sectionKey, data }) => {
    const currentProject = state.entities[projectId] as Project;
    const advancedCfg: WorkContextAdvancedCfg = Object.assign(
      {},
      currentProject.advancedCfg,
    );
    return projectAdapter.updateOne(
      {
        id: projectId,
        changes: {
          advancedCfg: {
            ...advancedCfg,
            [sectionKey]: {
              ...advancedCfg[sectionKey],
              ...data,
            },
          },
        },
      },
      state,
    );
  }),

  on(updateProjectOrder, (state, { ids }) => {
    const currentIds = state.ids.filter((id) => id !== INBOX_PROJECT.id) as string[];
    let newIds: string[] = ids;
    if (ids.length !== currentIds.length) {
      const allP = currentIds.map((id) => state.entities[id]) as Project[];
      const archivedIds = allP.filter((p) => p.isArchived).map((p) => p.id);
      const unarchivedIds = allP.filter((p) => !p.isArchived).map((p) => p.id);
      if (
        ids.length === unarchivedIds.length &&
        ids.length > 0 &&
        unarchivedIds.includes(ids[0])
      ) {
        newIds = [...ids, ...archivedIds];
      } else if (
        ids.length === archivedIds.length &&
        ids.length > 0 &&
        archivedIds.includes(ids[0])
      ) {
        newIds = [...unarchivedIds, ...ids];
      } else {
        throw new Error('Invalid param given to UpdateProjectOrder');
      }
    }

    if (!newIds) {
      throw new Error('Project ids are undefined');
    }

    return {
      ...state,
      ids: state.entities[INBOX_PROJECT.id] ? [INBOX_PROJECT.id, ...newIds] : newIds,
    };
  }),

  // MOVE TASK ACTIONS
  // -----------------
  on(moveProjectTaskToBacklogList, (state, { taskId, newOrderedIds, workContextId }) => {
    const project = state.entities[workContextId] as Project;
    if (!project.isEnableBacklog) {
      console.warn('Project backlog is disabled');
      return state;
    }
    const todaysTaskIdsBefore = project.taskIds;
    const backlogIdsBefore = project.backlogTaskIds;

    const filteredToday = todaysTaskIdsBefore.filter(filterOutId(taskId));
    const backlogTaskIds = moveItemInList(taskId, backlogIdsBefore, newOrderedIds);

    return projectAdapter.updateOne(
      {
        id: workContextId,
        changes: {
          taskIds: filteredToday,
          backlogTaskIds,
        },
      },
      state,
    );
  }),

  on(moveProjectTaskToRegularList, (state, { taskId, newOrderedIds, workContextId }) => {
    const backlogIdsBefore = (state.entities[workContextId] as Project).backlogTaskIds;
    const todaysTaskIdsBefore = (state.entities[workContextId] as Project).taskIds;

    const filteredBacklog = backlogIdsBefore.filter(filterOutId(taskId));
    const newTodaysTaskIds = moveItemInList(taskId, todaysTaskIdsBefore, newOrderedIds);

    return projectAdapter.updateOne(
      {
        id: workContextId,
        changes: {
          taskIds: newTodaysTaskIds,
          backlogTaskIds: filteredBacklog,
        },
      },
      state,
    );
  }),

  on(
    moveTaskUpInTodayList,
    (state, { taskId, workContextType, workContextId, doneTaskIds }) => {
      return workContextType === WORK_CONTEXT_TYPE
        ? projectAdapter.updateOne(
            {
              id: workContextId,
              changes: {
                taskIds: arrayMoveLeftUntil(
                  (state.entities[workContextId] as Project).taskIds,
                  taskId,
                  (id) => !doneTaskIds.includes(id),
                ),
              },
            },
            state,
          )
        : state;
    },
  ),

  on(
    moveTaskDownInTodayList,
    (state, { taskId, workContextType, workContextId, doneTaskIds }) => {
      return workContextType === WORK_CONTEXT_TYPE
        ? projectAdapter.updateOne(
            {
              id: workContextId,
              changes: {
                taskIds: arrayMoveRightUntil(
                  (state.entities[workContextId] as Project).taskIds,
                  taskId,
                  (id) => !doneTaskIds.includes(id),
                ),
              },
            },
            state,
          )
        : state;
    },
  ),

  on(moveTaskToTopInTodayList, (state, { taskId, workContextType, workContextId }) => {
    return workContextType === WORK_CONTEXT_TYPE
      ? projectAdapter.updateOne(
          {
            id: workContextId,
            changes: {
              taskIds: arrayMoveToStart(
                (state.entities[workContextId] as Project).taskIds,
                taskId,
              ),
            },
          },
          state,
        )
      : state;
  }),

  on(moveTaskToBottomInTodayList, (state, { taskId, workContextType, workContextId }) => {
    return workContextType === WORK_CONTEXT_TYPE
      ? projectAdapter.updateOne(
          {
            id: workContextId,
            changes: {
              taskIds: arrayMoveToEnd(
                (state.entities[workContextId] as Project).taskIds,
                taskId,
              ),
            },
          },
          state,
        )
      : state;
  }),

  on(
    moveProjectTaskUpInBacklogList,
    (state, { taskId, workContextId, doneBacklogTaskIds }) => {
      return projectAdapter.updateOne(
        {
          id: workContextId,
          changes: {
            backlogTaskIds: arrayMoveLeftUntil(
              (state.entities[workContextId] as Project).backlogTaskIds,
              taskId,
              (id) => !doneBacklogTaskIds.includes(id),
            ),
          },
        },
        state,
      );
    },
  ),

  on(
    moveProjectTaskDownInBacklogList,
    (state, { taskId, workContextId, doneBacklogTaskIds }) => {
      return projectAdapter.updateOne(
        {
          id: workContextId,
          changes: {
            backlogTaskIds: arrayMoveRightUntil(
              (state.entities[workContextId] as Project).backlogTaskIds,
              taskId,
              (id) => !doneBacklogTaskIds.includes(id),
            ),
          },
        },
        state,
      );
    },
  ),

  on(
    moveProjectTaskToTopInBacklogList,
    (state, { taskId, workContextId, doneBacklogTaskIds }) => {
      return projectAdapter.updateOne(
        {
          id: workContextId,
          changes: {
            backlogTaskIds: arrayMoveToStart(
              (state.entities[workContextId] as Project).backlogTaskIds,
              taskId,
            ),
          },
        },
        state,
      );
    },
  ),

  on(moveProjectTaskToBottomInBacklogList, (state, { taskId, workContextId }) => {
    return projectAdapter.updateOne(
      {
        id: workContextId,
        changes: {
          backlogTaskIds: arrayMoveToEnd(
            (state.entities[workContextId] as Project).backlogTaskIds,
            taskId,
          ),
        },
      },
      state,
    );
  }),

  on(moveProjectTaskToBacklogListAuto, (state, { taskId, projectId }) => {
    const project = state.entities[projectId] as Project;
    if (!project.isEnableBacklog) {
      console.warn('Project backlog is disabled');
      return state;
    }
    const todaysTaskIdsBefore = project.taskIds;
    const backlogIdsBefore = project.backlogTaskIds;
    return backlogIdsBefore.includes(taskId)
      ? state
      : projectAdapter.updateOne(
          {
            id: projectId,
            changes: {
              taskIds: todaysTaskIdsBefore.filter(filterOutId(taskId)),
              backlogTaskIds: [taskId, ...backlogIdsBefore],
            },
          },
          state,
        );
  }),

  on(moveProjectTaskToRegularListAuto, (state, { taskId, projectId, isMoveToTop }) => {
    const todaysTaskIdsBefore = (state.entities[projectId] as Project).taskIds;
    const backlogIdsBefore = (state.entities[projectId] as Project).backlogTaskIds;
    // we check if task was in backlog before to avoid moving up sub tasks
    return todaysTaskIdsBefore.includes(taskId) || !backlogIdsBefore.includes(taskId)
      ? state
      : projectAdapter.updateOne(
          {
            id: projectId,
            changes: {
              backlogTaskIds: backlogIdsBefore.filter(filterOutId(taskId)),
              taskIds: isMoveToTop
                ? [taskId, ...todaysTaskIdsBefore]
                : [...todaysTaskIdsBefore, taskId],
            },
          },
          state,
        );
  }),

  // Note Actions
  // ------------
  on(addNote, (state, { note }) =>
    note.projectId
      ? projectAdapter.updateOne(
          {
            id: note.projectId as string,
            changes: {
              noteIds: [note.id, ...(state.entities[note.projectId] as Project).noteIds],
            },
          },
          state,
        )
      : state,
  ),

  on(deleteNote, (state, { projectId, id }) =>
    projectId
      ? projectAdapter.updateOne(
          {
            id: projectId,
            changes: {
              noteIds: (state.entities[projectId] as Project).noteIds.filter(
                (nid) => nid !== id,
              ),
            },
          },
          state,
        )
      : state,
  ),

  on(updateNoteOrder, (state, { ids, activeContextType, activeContextId }) =>
    activeContextType === WorkContextType.PROJECT
      ? projectAdapter.updateOne(
          {
            id: activeContextId as string,
            changes: {
              noteIds: ids,
            },
          },
          state,
        )
      : state,
  ),

  // Task Actions
  // ------------
  on(addTask, (state, { task, isAddToBottom, isAddToBacklog }) => {
    const affectedProject = task.projectId && state.entities[task.projectId];
    if (!affectedProject) return state; // if there is no projectId, no changes are needed

    const prop: 'backlogTaskIds' | 'taskIds' =
      isAddToBacklog && affectedProject.isEnableBacklog ? 'backlogTaskIds' : 'taskIds';

    const changes: { [x: string]: any[] } = {};
    if (isAddToBottom) {
      changes[prop] = [...affectedProject[prop], task.id];
    } else {
      // TODO #1382 get the currentTaskId from a different part of the state tree or via payload or _taskService
      // const currentTaskId = payload.currentTaskId || this._taskService.currentTaskId
      // const isAfterRunningTask = prop==='taskIds' && currentTaskId
      // console.log('isAfterRunningTask?',isAfterRunningTask,'currentTaskId',currentTaskId);
      // if (isAfterRunningTask) add the new task in the list after currentTaskId
      // else { // add to the top
      changes[prop] = [task.id, ...affectedProject[prop]];
      //}
    }
    return projectAdapter.updateOne(
      {
        id: task.projectId as string,
        changes,
      },
      state,
    );
  }),

  on(convertToMainTask, (state, { task }) => {
    const affectedEntity = task.projectId && state.entities[task.projectId];
    return affectedEntity
      ? projectAdapter.updateOne(
          {
            id: task.projectId as string,
            changes: {
              taskIds: [task.id, ...affectedEntity.taskIds],
            },
          },
          state,
        )
      : state;
  }),

  on(deleteTask, (state, { task }) => {
    const project = task.projectId && (state.entities[task.projectId] as Project);
    return project
      ? projectAdapter.updateOne(
          {
            id: task.projectId as string,
            changes: {
              taskIds: project.taskIds.filter((ptId) => ptId !== task.id),
              backlogTaskIds: project.backlogTaskIds.filter((ptId) => ptId !== task.id),
            },
          },
          state,
        )
      : state;
  }),

  on(moveToArchive_, (state, { tasks }) => {
    const taskIdsToMoveToArchive = tasks.map((t: Task) => t.id);
    const projectIds = unique<string>(
      tasks
        .map((t: Task) => t.projectId || null)
        .filter((pid: string | null) => !!pid) as string[],
    );
    const updates: Update<Project>[] = projectIds.map((pid: string) => ({
      id: pid,
      changes: {
        taskIds: (state.entities[pid] as Project).taskIds.filter(
          (taskId) => !taskIdsToMoveToArchive.includes(taskId),
        ),
        backlogTaskIds: (state.entities[pid] as Project).backlogTaskIds.filter(
          (taskId) => !taskIdsToMoveToArchive.includes(taskId),
        ),
      },
    }));
    return projectAdapter.updateMany(updates, state);
  }),
  on(restoreTask, (state, { task }) => {
    if (!task.projectId) {
      return state;
    }

    return projectAdapter.updateOne(
      {
        id: task.projectId,
        changes: {
          taskIds: [...(state.entities[task.projectId] as Project).taskIds, task.id],
        },
      },
      state,
    );
  }),
  on(moveToOtherProject, (state, { task, targetProjectId }) => {
    const srcProjectId = task.projectId;
    const updates: Update<Project>[] = [];

    if (srcProjectId === targetProjectId) {
      devError('Moving task from same project to same project.');
      return state;
    }

    if (srcProjectId) {
      updates.push({
        id: srcProjectId,
        changes: {
          taskIds: (state.entities[srcProjectId] as Project).taskIds.filter(
            (id) => id !== task.id,
          ),
          backlogTaskIds: (state.entities[srcProjectId] as Project).backlogTaskIds.filter(
            (id) => id !== task.id,
          ),
        },
      });
    }
    if (targetProjectId) {
      updates.push({
        id: targetProjectId,
        changes: {
          taskIds: [...(state.entities[targetProjectId] as Project).taskIds, task.id],
        },
      });
    }

    return projectAdapter.updateMany(updates, state);
  }),

  on(moveNoteToOtherProject, (state, { note, targetProjectId }) => {
    const srcProjectId = note.projectId;
    const updates: Update<Project>[] = [];

    if (srcProjectId === targetProjectId) {
      devError('Moving task from same project to same project.');
      return state;
    }

    if (srcProjectId) {
      updates.push({
        id: srcProjectId,
        changes: {
          noteIds: (state.entities[srcProjectId] as Project).noteIds.filter(
            (id) => id !== note.id,
          ),
        },
      });
    }
    if (targetProjectId) {
      updates.push({
        id: targetProjectId,
        changes: {
          noteIds: [...(state.entities[targetProjectId] as Project).noteIds, note.id],
        },
      });
    }

    return projectAdapter.updateMany(updates, state);
  }),
  on(moveAllProjectBacklogTasksToRegularList, (state, { projectId }) => {
    const project = state.entities[projectId] as Project;
    return projectAdapter.updateOne(
      {
        id: projectId,
        changes: {
          taskIds: [...project.taskIds, ...project.backlogTaskIds],
          backlogTaskIds: [],
        },
      },
      state,
    );
  }),
  // on(AAA, (state, {AAA})=> {  }),
);
