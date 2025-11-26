import { PluginAPI } from '@super-productivity/plugin-api';
import { Condition, TaskEvent } from '../types';

export class ConditionEvaluator {
  constructor(private plugin: PluginAPI) {}

  async allConditionsMatch(conditions: Condition[], event: TaskEvent): Promise<boolean> {
    for (const condition of conditions) {
      if (!(await this.checkCondition(condition, event))) {
        return false;
      }
    }
    return true;
  }

  private async checkCondition(condition: Condition, event: TaskEvent): Promise<boolean> {
    const task = event.task;

    switch (condition.type) {
      case 'titleContains':
        return task.title.toLowerCase().includes(condition.value.toLowerCase());

      case 'projectIs':
        if (!task.projectId) return false;
        // Optimization: Cache projects if needed, but for MVP fetching is safer
        const projects = await this.plugin.getAllProjects();
        const project = projects.find((p) => p.id === task.projectId);
        return project ? project.title === condition.value : false;

      case 'hasTag':
        if (!task.tagIds || task.tagIds.length === 0) return false;
        const tags = await this.plugin.getAllTags();
        const tag = tags.find((t) => t.title === condition.value);
        if (!tag) return false;
        return task.tagIds.includes(tag.id);

      default:
        return false;
    }
  }
}
