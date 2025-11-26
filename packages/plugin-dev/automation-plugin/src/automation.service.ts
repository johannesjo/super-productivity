import { PluginAPI, Task } from '@super-productivity/plugin-api';
import { Action, AutomationRule, AutomationTriggerType, Condition, TaskEvent } from './types';

export class AutomationService {
  private rules: AutomationRule[] = [];

  constructor(private plugin: PluginAPI) {
    this.initRules();
  }

  private initRules() {
    // Hardcoded example rules for MVP
    this.rules = [
      {
        id: '1',
        name: 'Automatic Onboarding Tasks',
        isEnabled: true,
        trigger: { type: 'taskCreated' },
        conditions: [{ type: 'titleContains', value: 'feature' }],
        actions: [{ type: 'createTask', value: 'Write acceptance criteria' }],
      },
      {
        id: '2',
        name: 'Tag Newly Created Tasks Automatically',
        isEnabled: true,
        trigger: { type: 'taskCreated' },
        conditions: [{ type: 'projectIs', value: 'General Inbox' }],
        actions: [{ type: 'addTag', value: 'inbox' }],
      },
      {
        id: '3',
        name: 'Automatically Follow Up Changes',
        isEnabled: true,
        trigger: { type: 'taskUpdated' },
        conditions: [{ type: 'titleContains', value: 'urgent' }],
        actions: [{ type: 'addTag', value: 'prioritized' }],
      },
      {
        id: '4',
        name: 'Turn Task Updates Into Workflows',
        isEnabled: true,
        trigger: { type: 'taskUpdated' },
        conditions: [{ type: 'hasTag', value: 'review' }],
        actions: [{ type: 'createTask', value: 'Check notes before finishing' }],
      },
    ];
  }

  async onTaskEvent(event: TaskEvent) {
    this.plugin.log.info(`[Automation] Event received: ${event.type}`, event.task.title);

    for (const rule of this.rules) {
      if (!rule.isEnabled) continue;
      if (rule.trigger.type !== event.type) continue;

      const matches = await this.conditionsMatch(rule.conditions, event);
      if (!matches) continue;

      this.plugin.log.info(`[Automation] Rule matched: ${rule.name}`);
      await this.runActions(rule.actions, event);
    }
  }

  private async conditionsMatch(conditions: Condition[], event: TaskEvent): Promise<boolean> {
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

  private async runActions(actions: Action[], event: TaskEvent) {
    for (const action of actions) {
      await this.runAction(action, event);
    }
  }

  private async runAction(action: Action, event: TaskEvent) {
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
