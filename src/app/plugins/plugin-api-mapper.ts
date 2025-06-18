/**
 * Mapper functions to convert between internal app types and plugin API types
 * This ensures plugins work with simplified, stable data structures
 * while the app can evolve its internal types independently
 */

import { TaskCopy } from '../features/tasks/task.model';
import { ProjectCopy } from '../features/project/project.model';
import { TagCopy } from '../features/tag/tag.model';
import { SnackParams } from '../core/snack/snack.model';
import { TaskData, ProjectData, TagData, SnackCfg } from '@super-productivity/plugin-api';

/**
 * Convert internal TaskCopy to plugin API TaskData
 */
export const taskCopyToTaskData = (task: TaskCopy): TaskData => {
  return {
    id: task.id,
    title: task.title,
    notes: task.notes,
    timeEstimate: task.timeEstimate,
    timeSpent: task.timeSpent,
    isDone: task.isDone,
    projectId: task.projectId || null,
    tagIds: task.tagIds,
    parentId: task.parentId || null,
    created: task.created,
    updated: (task as any).updated || 0,
  };
};

/**
 * Convert plugin API TaskData to partial TaskCopy for updates
 */
export const taskDataToPartialTaskCopy = (
  updates: Partial<TaskData>,
): Partial<TaskCopy> => {
  const result: Partial<TaskCopy> = {};

  // Only copy fields that exist in TaskData to avoid unintended updates
  if ('title' in updates) result.title = updates.title;
  if ('notes' in updates) result.notes = updates.notes;
  if ('timeEstimate' in updates) result.timeEstimate = updates.timeEstimate;
  if ('timeSpent' in updates) result.timeSpent = updates.timeSpent;
  if ('isDone' in updates) result.isDone = updates.isDone;
  if ('projectId' in updates) result.projectId = updates.projectId || undefined;
  if ('tagIds' in updates) result.tagIds = updates.tagIds;
  if ('parentId' in updates) result.parentId = updates.parentId || undefined;

  return result;
};

/**
 * Convert internal ProjectCopy to plugin API ProjectData
 */
export const projectCopyToProjectData = (project: ProjectCopy): ProjectData => {
  return {
    id: project.id,
    title: project.title,
    themeColor: project.theme?.primary,
    isDone: project.isArchived, // Map isArchived to isDone for plugins
    created: (project as any).created || 0,
    updated: (project as any).updated || 0,
  };
};

/**
 * Convert plugin API ProjectData to partial ProjectCopy for updates
 */
export const projectDataToPartialProjectCopy = (
  updates: Partial<ProjectData>,
): Partial<ProjectCopy> => {
  const result: Partial<ProjectCopy> = {};

  if ('title' in updates) result.title = updates.title;
  if ('themeColor' in updates && updates.themeColor) {
    result.theme = {
      primary: updates.themeColor,
      // Use defaults for other theme properties
      // primaryContrast: '#ffffff', // Not available in current theme type
    };
  }
  if ('isDone' in updates) result.isArchived = updates.isDone;

  return result;
};

/**
 * Convert internal TagCopy to plugin API TagData
 */
export const tagCopyToTagData = (tag: TagCopy): TagData => {
  return {
    id: tag.id,
    title: tag.title,
    color: tag.color || undefined,
    created: tag.created,
    updated: (tag as any).updated || 0,
  };
};

/**
 * Convert plugin API TagData to partial TagCopy for updates
 */
export const tagDataToPartialTagCopy = (updates: Partial<TagData>): Partial<TagCopy> => {
  const result: Partial<TagCopy> = {};

  if ('title' in updates) result.title = updates.title;
  if ('color' in updates) result.color = updates.color;

  return result;
};

/**
 * Convert plugin API SnackCfg to internal SnackParams
 */
export const snackCfgToSnackParams = (snackCfg: SnackCfg): SnackParams => {
  // Map plugin API types to internal types
  let internalType: 'ERROR' | 'SUCCESS' | 'CUSTOM' = 'CUSTOM';

  switch (snackCfg.type) {
    case 'SUCCESS':
      internalType = 'SUCCESS';
      break;
    case 'ERROR':
      internalType = 'ERROR';
      break;
    case 'WARNING':
    case 'INFO':
    default:
      internalType = 'CUSTOM';
      break;
  }

  return {
    msg: snackCfg.msg,
    type: internalType,
    ico: snackCfg.ico,
  };
};
