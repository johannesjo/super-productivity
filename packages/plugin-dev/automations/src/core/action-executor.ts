import { PluginAPI } from '@super-productivity/plugin-api';
import { Action, TaskEvent } from '../types';

export class ActionExecutor {
  constructor(private plugin: PluginAPI) {}

  async executeAll(actions: Action[], event: TaskEvent) {
    for (const action of actions) {
      await this.executeAction(action, event);
    }
  }

  private async executeAction(action: Action, event: TaskEvent) {
    switch (action.type) {
      case 'createTask':
        await this.plugin.addTask({
          title: action.value,
          projectId: event.task.projectId, // Inherit project? Or make configurable? MVP: inherit if implicit context
        });
        this.plugin.log.info(`[Automation] Action: Created task "${action.value}"`);
        break;

      case 'addTag':
        // Find tag by title first
        const tags = await this.plugin.getAllTags();
        let tagId = tags.find((t) => t.title === action.value)?.id;

        // Create tag if it doesn't exist? MVP: Assume it exists or fail gracefully
        if (!tagId) {
          this.plugin.log.warn(`[Automation] Tag "${action.value}" not found.`);
          return;
        }

        // Avoid adding duplicate tags
        if (event.task.tagIds.includes(tagId)) return;

        await this.plugin.updateTask(event.task.id, {
          tagIds: [...event.task.tagIds, tagId],
        });
        this.plugin.log.info(`[Automation] Action: Added tag "${action.value}"`);
        break;
    }
  }
}
