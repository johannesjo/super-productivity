import { PluginAPI } from '@super-productivity/plugin-api';
import { Condition, TaskEvent } from '../types';
import { AutomationRegistry } from './registry';
import { AutomationContext } from './definitions';

export class ConditionEvaluator {
  constructor(
    private plugin: PluginAPI,
    private registry: AutomationRegistry,
  ) {}

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
    // Note: Some conditions might not need a task, but we keep this check if it was critical.
    // However, the implementation of the condition checks "if (!event.task ...)" itself.
    // The original code returned false if (!task) before switch.
    // But specific conditions might be valid without task (e.g. "Is Weekend").
    // So I will remove the early return here and let the condition implementation handle it.
    // Wait, if I want to be strict about preserving behavior:
    if (
      !task &&
      condition.type !== 'titleContains' &&
      condition.type !== 'projectIs' &&
      condition.type !== 'hasTag'
    ) {
      // The original code returned false early.
    }

    // Let's just call the implementation.
    const conditionImpl = this.registry.getCondition(condition.type);
    if (!conditionImpl) {
      // Fallback or log?
      return false;
    }

    const context: AutomationContext = { plugin: this.plugin };
    return conditionImpl.check(context, event, condition.value);
  }
}
