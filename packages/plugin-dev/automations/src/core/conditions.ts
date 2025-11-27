import { IAutomationCondition } from './definitions';

export const ConditionTitleContains: IAutomationCondition = {
  id: 'titleContains',
  name: 'Title contains',
  check: async (ctx, event, value) => {
    if (!event.task || !value) return false;
    return event.task.title.toLowerCase().includes(value.toLowerCase());
  },
};

export const ConditionProjectIs: IAutomationCondition = {
  id: 'projectIs',
  name: 'Project is',
  check: async (ctx, event, value) => {
    if (!event.task || !event.task.projectId || !value) return false;
    const projects = await ctx.dataCache.getProjects();
    const project = projects.find((p) => p.id === event.task?.projectId);
    return project ? project.title === value : false;
  },
};

export const ConditionHasTag: IAutomationCondition = {
  id: 'hasTag',
  name: 'Has tag',
  check: async (ctx, event, value) => {
    if (!event.task || !event.task.tagIds || !value) return false;
    const tags = await ctx.dataCache.getTags();
    const tag = tags.find((t) => t.title === value);
    return tag ? event.task.tagIds.includes(tag.id) : false;
  },
};
