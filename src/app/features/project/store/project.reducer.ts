import { createEntityAdapter, EntityAdapter, EntityState, Update } from '@ngrx/entity';
import { Project } from '../project.model';
import { ProjectActions, ProjectActionTypes } from './project.actions';
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { FIRST_PROJECT, PROJECT_MODEL_VERSION } from '../project.const';
import { JiraCfg } from '../../issue/providers/jira/jira.model';
import { GithubCfg } from '../../issue/providers/github/github.model';
import { WorkContextType } from '../../work-context/work-context.model';
import {
  AddTask,
  DeleteTask,
  MoveToArchive,
  MoveToOtherProject,
  RestoreTask,
  TaskActionTypes
} from '../../tasks/store/task.actions';
import {
  moveTaskDownInBacklogList,
  moveTaskDownInTodayList,
  moveTaskInBacklogList,
  moveTaskInTodayList,
  moveTaskToBacklogList,
  moveTaskToBacklogListAuto,
  moveTaskToTodayList,
  moveTaskToTodayListAuto,
  moveTaskUpInBacklogList,
  moveTaskUpInTodayList
} from '../../work-context/store/work-context-meta.actions';
import { moveItemInList, moveTaskForWorkContextLikeState } from '../../work-context/store/work-context-meta.helper';
import { arrayMoveLeft, arrayMoveRight } from '../../../util/array-move';
import { filterOutId } from '../../../util/filter-out-id';
import { unique } from '../../../util/unique';
import { GITHUB_TYPE, GITLAB_TYPE, JIRA_TYPE } from '../../issue/issue.const';
import { GitlabCfg } from '../../issue/providers/gitlab/gitlab';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';
import { AppDataComplete } from '../../../imex/sync/sync.model';
import { migrateProjectState } from '../migrate-projects-state.util';
import { MODEL_VERSION_KEY } from '../../../app.constants';

export const PROJECT_FEATURE_NAME = 'projects';
const WORK_CONTEXT_TYPE: WorkContextType = WorkContextType.PROJECT;

export interface ProjectState extends EntityState<Project> {
  [MODEL_VERSION_KEY]?: number;
}

export const projectAdapter: EntityAdapter<Project> = createEntityAdapter<Project>();

// SELECTORS
// ---------
export const selectProjectFeatureState = createFeatureSelector<ProjectState>(PROJECT_FEATURE_NAME);
const {selectIds, selectEntities, selectAll, selectTotal} = projectAdapter.getSelectors();
export const selectAllProjects = createSelector(selectProjectFeatureState, selectAll);
export const selectUnarchivedProjects = createSelector(selectAllProjects, (projects) => projects.filter(p => !p.isArchived));

export const selectArchivedProjects = createSelector(selectAllProjects, (projects) => projects.filter(p => p.isArchived));

// DYNAMIC SELECTORS
// -----------------
export const selectProjectById = createSelector(
  selectProjectFeatureState,
  (state, props: { id: string }): Project => state.entities[props.id]
);

export const selectJiraCfgByProjectId = createSelector(
  selectProjectById,
  (p: Project): JiraCfg => p.issueIntegrationCfgs[JIRA_TYPE] as JiraCfg
);

export const selectGithubCfgByProjectId = createSelector(
  selectProjectById,
  (p: Project): GithubCfg => p.issueIntegrationCfgs[GITHUB_TYPE] as GithubCfg
);

export const selectGitlabCfgByProjectId = createSelector(
  selectProjectById,
  (p: Project): GitlabCfg => p.issueIntegrationCfgs[GITLAB_TYPE] as GitlabCfg
);

export const selectUnarchivedProjectsWithoutCurrent = createSelector(
  selectProjectFeatureState,
  (s, props: { currentId: string }) => {
    const ids = s.ids as string[];
    return ids.filter(id => id !== props.currentId).map(id => s.entities[id]).filter(p => !p.isArchived && p.id);
  },
);

export const selectProjectBreakTimeForProject = createSelector(selectProjectById, (project) => project.breakTime);
export const selectProjectBreakNrForProject = createSelector(selectProjectById, (project) => project.breakNr);

// DEFAULT
// -------
export const initialProjectState: ProjectState = projectAdapter.getInitialState({
  ids: [
    FIRST_PROJECT.id
  ],
  entities: {
    [FIRST_PROJECT.id]: FIRST_PROJECT
  },
  [MODEL_VERSION_KEY]: PROJECT_MODEL_VERSION,
});

// REDUCER
// -------
export function projectReducer(
  state: ProjectState = initialProjectState,
  action: ProjectActions | AddTask | DeleteTask | MoveToOtherProject | MoveToArchive | RestoreTask
): ProjectState {
  // tslint:disable-next-line
  const payload = action['payload'];

  // TODO fix this hackyness once we use the new syntax everywhere
  if ((action.type as string) === loadAllData.type) {
    const {appDataComplete}: { appDataComplete: AppDataComplete } = action as any;
    return appDataComplete.project
      ? migrateProjectState({...appDataComplete.project})
      : state;
  }

  if ((action.type as string) === moveTaskInTodayList.type) {
    const {taskId, newOrderedIds, target, workContextType, workContextId} = action as any;

    if (workContextType !== WORK_CONTEXT_TYPE) {
      return state;
    }

    const taskIdsBefore = state.entities[workContextId].taskIds;
    const taskIds = moveTaskForWorkContextLikeState(taskId, newOrderedIds, target, taskIdsBefore);
    return projectAdapter.updateOne({
      id: workContextId,
      changes: {
        taskIds
      }
    }, state);
  }

  if ((action.type as string) === moveTaskInBacklogList.type) {
    const {taskId, newOrderedIds, workContextId} = action as any;

    const taskIdsBefore = state.entities[workContextId].backlogTaskIds;
    const backlogTaskIds = moveTaskForWorkContextLikeState(taskId, newOrderedIds, null, taskIdsBefore);
    return projectAdapter.updateOne({
      id: workContextId,
      changes: {
        backlogTaskIds
      }
    }, state);
  }

  if ((action.type as string) === moveTaskToBacklogList.type) {
    const {taskId, newOrderedIds, workContextId} = action as any;

    const todaysTaskIdsBefore = state.entities[workContextId].taskIds;
    const backlogIdsBefore = state.entities[workContextId].backlogTaskIds;

    const filteredToday = todaysTaskIdsBefore.filter(filterOutId(taskId));
    const backlogTaskIds = moveItemInList(taskId, backlogIdsBefore, newOrderedIds);

    return projectAdapter.updateOne({
      id: workContextId,
      changes: {
        taskIds: filteredToday,
        backlogTaskIds,
      }
    }, state);
  }

  if ((action.type as string) === moveTaskToTodayList.type) {
    const {taskId, newOrderedIds, workContextId} = action as any;

    const backlogIdsBefore = state.entities[workContextId].backlogTaskIds;
    const todaysTaskIdsBefore = state.entities[workContextId].taskIds;

    const filteredBacklog = backlogIdsBefore.filter(filterOutId(taskId));
    const newTodaysTaskIds = moveItemInList(taskId, todaysTaskIdsBefore, newOrderedIds);

    return projectAdapter.updateOne({
      id: workContextId,
      changes: {
        taskIds: newTodaysTaskIds,
        backlogTaskIds: filteredBacklog,
      }
    }, state);
  }

  // up down today
  if ((action.type as string) === moveTaskUpInTodayList.type) {
    const {taskId, workContextType, workContextId} = action as any;
    return (workContextType === WORK_CONTEXT_TYPE)
      ? projectAdapter.updateOne({
        id: workContextId,
        changes: {
          taskIds: arrayMoveLeft(state.entities[workContextId].taskIds, taskId)
        }
      }, state)
      : state;
  }

  if ((action.type as string) === moveTaskDownInTodayList.type) {
    const {taskId, workContextType, workContextId} = action as any;
    return (workContextType === WORK_CONTEXT_TYPE)
      ? projectAdapter.updateOne({
        id: workContextId,
        changes: {
          taskIds: arrayMoveRight(state.entities[workContextId].taskIds, taskId)
        }
      }, state)
      : state;
  }

  // up down backlog
  if ((action.type as string) === moveTaskUpInBacklogList.type) {
    const {taskId, workContextId} = action as any;
    return projectAdapter.updateOne({
      id: workContextId,
      changes: {
        backlogTaskIds: arrayMoveLeft(state.entities[workContextId].backlogTaskIds, taskId)
      }
    }, state);
  }

  if ((action.type as string) === moveTaskDownInBacklogList.type) {
    const {taskId, workContextId} = action as any;
    return projectAdapter.updateOne({
      id: workContextId,
      changes: {
        backlogTaskIds: arrayMoveRight(state.entities[workContextId].backlogTaskIds, taskId)
      }
    }, state);
  }

  // AUTO move backlog/today
  if ((action.type as string) === moveTaskToBacklogListAuto.type) {
    const {taskId, workContextId} = action as any;
    const todaysTaskIdsBefore = state.entities[workContextId].taskIds;
    const backlogIdsBefore = state.entities[workContextId].backlogTaskIds;
    return (backlogIdsBefore.includes(taskId))
      ? state
      : projectAdapter.updateOne({
        id: workContextId,
        changes: {
          taskIds: todaysTaskIdsBefore.filter(filterOutId(taskId)),
          backlogTaskIds: [taskId, ...backlogIdsBefore],
        }
      }, state);
  }

  if ((action.type as string) === moveTaskToTodayListAuto.type) {
    const {taskId, workContextId, isMoveToTop} = action as any;
    const todaysTaskIdsBefore = state.entities[workContextId].taskIds;
    const backlogIdsBefore = state.entities[workContextId].backlogTaskIds;
    return (todaysTaskIdsBefore.includes(taskId))
      ? state
      : projectAdapter.updateOne({
        id: workContextId,
        changes: {
          backlogTaskIds: backlogIdsBefore.filter(filterOutId(taskId)),
          taskIds: (isMoveToTop)
            ? [taskId, ...todaysTaskIdsBefore]
            : [...todaysTaskIdsBefore, taskId]
        }
      }, state);
  }

  switch (action.type) {
    // Meta Actions
    // ------------
    case TaskActionTypes.AddTask: {
      const {workContextId, workContextType, task, isAddToBottom, isAddToBacklog} = payload;
      const affectedEntity = task.projectId && state.entities[task.projectId];
      const prop: 'backlogTaskIds' | 'taskIds' = isAddToBacklog ? 'backlogTaskIds' : 'taskIds';

      return (affectedEntity)
        ? projectAdapter.updateOne({
          id: task.projectId,
          changes: {
            [prop]: isAddToBottom
              ? [
                task.id,
                ...affectedEntity[prop]
              ]
              : [
                ...affectedEntity[prop],
                task.id,
              ]
          }
        }, state)
        : state;
    }

    case TaskActionTypes.DeleteTask: {
      const {task} = action.payload;
      const project = state.entities[task.projectId];
      return (task.projectId)
        ? projectAdapter.updateOne({
          id: task.projectId,
          changes: {
            taskIds: project.taskIds.filter(ptId => ptId !== task.id),
            backlogTaskIds: project.backlogTaskIds.filter(ptId => ptId !== task.id)
          }
        }, state)
        : state;
    }

    case TaskActionTypes.MoveToArchive: {
      const {tasks} = action.payload;
      const taskIdsToMoveToArchive = tasks.map(t => t.id);
      const projectIds = unique(
        tasks
          .map(t => t.projectId)
          .filter(pid => !!pid)
      );
      const updates: Update<Project>[] = projectIds.map(pid => ({
        id: pid,
        changes: {
          taskIds: state.entities[pid].taskIds.filter(taskId => !taskIdsToMoveToArchive.includes(taskId)),
          backlogTaskIds: state.entities[pid].backlogTaskIds.filter(taskId => !taskIdsToMoveToArchive.includes(taskId)),
        }
      }));
      return projectAdapter.updateMany(updates, state);
    }

    case TaskActionTypes.RestoreTask: {
      const {task} = action.payload;
      if (!task.projectId) {
        return state;
      }

      return projectAdapter.updateOne({
        id: task.projectId,
        changes: {
          taskIds: [...state.entities[task.projectId].taskIds, task.id]
        }
      }, state);
    }

    case TaskActionTypes.MoveToOtherProject: {
      const {task, targetProjectId} = action.payload;
      const srcProjectId = task.projectId;
      const updates: Update<Project>[] = [];

      if (srcProjectId) {
        updates.push({
          id: srcProjectId,
          changes: {
            taskIds: state.entities[srcProjectId].taskIds.filter(id => id !== task.id),
            backlogTaskIds: state.entities[srcProjectId].backlogTaskIds.filter(id => id !== task.id),
          }
        });
      }
      if (targetProjectId) {
        updates.push({
          id: targetProjectId,
          changes: {
            taskIds: [...state.entities[targetProjectId].taskIds, task.id],
          }
        });
      }

      return projectAdapter.updateMany(updates, state);
    }


    // Project Actions
    // ------------
    case ProjectActionTypes.LoadProjectRelatedDataSuccess: {
      return state;
    }

    case ProjectActionTypes.AddProject: {
      return projectAdapter.addOne(payload.project, state);
    }

    case ProjectActionTypes.UpsertProject: {
      return projectAdapter.upsertOne(payload.project, state);
    }

    case ProjectActionTypes.AddProjects: {
      return projectAdapter.addMany(payload.projects, state);
    }

    case ProjectActionTypes.UpdateProject: {
      return projectAdapter.updateOne(payload.project, state);
    }

    case ProjectActionTypes.UpdateProjectWorkStart: {
      const {id, date, newVal} = action.payload;
      const oldP = state.entities[id];
      return projectAdapter.updateOne({
        id,
        changes: {
          workStart: {
            ...oldP.workStart,
            [date]: newVal,
          }
        }
      }, state);
    }

    case ProjectActionTypes.UpdateProjectWorkEnd: {
      const {id, date, newVal} = action.payload;
      const oldP = state.entities[id];
      return projectAdapter.updateOne({
        id,
        changes: {
          workEnd: {
            ...oldP.workEnd,
            [date]: newVal,
          }
        }
      }, state);
    }

    case ProjectActionTypes.AddToProjectBreakTime: {
      const {id, date, valToAdd} = action.payload;
      const oldP = state.entities[id];
      const oldBreakTime = oldP.breakTime[date] || 0;
      const oldBreakNr = oldP.breakNr[date] || 0;

      return projectAdapter.updateOne({
        id,
        changes: {
          breakNr: {
            ...oldP.breakNr,
            [date]: oldBreakNr + 1,
          },
          breakTime: {
            ...oldP.breakTime,
            [date]: oldBreakTime + valToAdd,
          }
        }
      }, state);
    }

    case ProjectActionTypes.DeleteProject: {
      return projectAdapter.removeOne(payload.id, state);
    }

    case ProjectActionTypes.DeleteProjects: {
      return projectAdapter.removeMany(payload.ids, state);
    }

    case ProjectActionTypes.LoadProjects: {
      return projectAdapter.setAll(payload.projects, state);
    }

    case ProjectActionTypes.UpdateProjectAdvancedCfg: {
      const {projectId, sectionKey, data} = payload;
      const currentProject = state.entities[projectId];
      const advancedCfg = Object.assign({}, currentProject.advancedCfg);
      return projectAdapter.updateOne({
        id: projectId,
        changes: {
          advancedCfg: {
            ...advancedCfg,
            [sectionKey]: {
              ...advancedCfg[sectionKey],
              ...data,
            }
          }
        }
      }, state);
    }

    case ProjectActionTypes.UpdateProjectIssueProviderCfg: {
      const {projectId, providerCfg, issueProviderKey, isOverwrite} = action.payload;
      const currentProject = state.entities[projectId];
      return projectAdapter.updateOne({
        id: projectId,
        changes: {
          issueIntegrationCfgs: {
            ...currentProject.issueIntegrationCfgs,
            [issueProviderKey]: {
              ...(isOverwrite ? {} : currentProject.issueIntegrationCfgs[issueProviderKey]),
              ...providerCfg,
            }
          }
        }
      }, state);
    }

    case ProjectActionTypes.UpdateProjectOrder: {
      const {ids} = action.payload;
      const currentIds = state.ids as string[];
      let newIds: string[] = ids;
      if (ids.length !== currentIds.length) {
        const allP = currentIds.map(id => state.entities[id]);
        const archivedIds = allP.filter(p => p.isArchived).map(p => p.id);
        const unarchivedIds = allP.filter(p => !p.isArchived).map(p => p.id);
        if (ids.length === unarchivedIds.length && ids.length > 0 && unarchivedIds.includes(ids[0])) {
          newIds = [...ids, ...archivedIds];
        } else if (ids.length === archivedIds.length && ids.length > 0 && archivedIds.includes(ids[0])) {
          newIds = [...unarchivedIds, ...ids];
        } else {
          throw new Error('Invalid param given to UpdateProjectOrder');
        }
      }

      if (!newIds) {
        throw new Error('Project ids are undefined');
      }

      return {...state, ids: newIds};
    }

    case ProjectActionTypes.ArchiveProject: {
      return projectAdapter.updateOne({
        id: action.payload.id,
        changes: {
          isArchived: true,
        }
      }, state);
    }

    case ProjectActionTypes.UnarchiveProject: {
      return projectAdapter.updateOne({
        id: action.payload.id,
        changes: {
          isArchived: false,
        }
      }, state);
    }

    default: {
      return state;
    }
  }
}
