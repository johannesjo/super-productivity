import { PluginAPI } from '@super-productivity/plugin-api';
import { TaskEvent } from '../types';
import { RuleRegistry } from './rule-registry';
import { ConditionEvaluator } from './condition-evaluator';
import { ActionExecutor } from './action-executor';

export class AutomationManager {
  private ruleRegistry: RuleRegistry;
  private conditionEvaluator: ConditionEvaluator;
  private actionExecutor: ActionExecutor;

  constructor(private plugin: PluginAPI) {
    this.ruleRegistry = new RuleRegistry();
    this.conditionEvaluator = new ConditionEvaluator(plugin);
    this.actionExecutor = new ActionExecutor(plugin);
  }

  async onTaskEvent(event: TaskEvent) {
    this.plugin.log.info(`[Automation] Event received: ${event.type}`, event.task.title);

    const rules = this.ruleRegistry.getEnabledRules();

    for (const rule of rules) {
      if (rule.trigger.type !== event.type) continue;

      const matches = await this.conditionEvaluator.allConditionsMatch(rule.conditions, event);
      if (!matches) continue;

      this.plugin.log.info(`[Automation] Rule matched: ${rule.name}`);
      await this.actionExecutor.executeAll(rule.actions, event);
    }
  }
}
