import { PluginAPI } from '@super-productivity/plugin-api';
import { TaskEvent } from '../types';
import { RuleRegistry } from './rule-registry';
import { ConditionEvaluator } from './condition-evaluator';
import { ActionExecutor } from './action-executor';

import { RateLimiter } from './rate-limiter';
import { DialogCfg } from '@super-productivity/plugin-api';

export class AutomationManager {
  private ruleRegistry: RuleRegistry;
  private conditionEvaluator: ConditionEvaluator;
  private actionExecutor: ActionExecutor;
  private rateLimiter: RateLimiter;
  private pendingDialogs: Set<string> = new Set();

  constructor(private plugin: PluginAPI) {
    this.ruleRegistry = new RuleRegistry(plugin);
    this.conditionEvaluator = new ConditionEvaluator(plugin);
    this.actionExecutor = new ActionExecutor(plugin);
    this.rateLimiter = new RateLimiter(5, 1000); // 5 executions per second
  }

  async onTaskEvent(event: TaskEvent) {
    if (!event.task) {
      this.plugin.log.warn(`[Automation] Event ${event.type} received without task data`);
      return;
    }
    this.plugin.log.info(`[Automation] Event received: ${event.type}`, event.task.title);

    const rules = this.ruleRegistry.getEnabledRules();

    for (const rule of rules) {
      if (rule.trigger.type !== event.type) continue;

      const matches = await this.conditionEvaluator.allConditionsMatch(rule.conditions, event);
      if (!matches) continue;

      // Check rate limit
      if (!this.rateLimiter.check(rule.id)) {
        this.plugin.log.warn(`[Automation] Rate limit exceeded for rule: ${rule.name}`);

        if (!this.pendingDialogs.has(rule.id)) {
          this.pendingDialogs.add(rule.id);

          const dialogCfg: DialogCfg = {
            htmlContent: `
              <h3>High Automation Activity Detected</h3>
              <p>The rule <strong>"${rule.name}"</strong> is triggering too frequently (infinite loop protection).</p>
              <p>Do you want to disable this rule or continue execution?</p>
            `,
            buttons: [
              {
                label: 'Disable Rule',
                color: 'warn',
                onClick: async () => {
                  await this.ruleRegistry.toggleRuleStatus(rule.id, false);
                  this.plugin.showSnack({ msg: `Rule "${rule.name}" disabled`, type: 'INFO' });
                  this.pendingDialogs.delete(rule.id);
                },
              },
              {
                label: 'Continue',
                color: 'primary',
                onClick: () => {
                  this.rateLimiter.reset(rule.id);
                  this.pendingDialogs.delete(rule.id);
                },
              },
            ],
          };

          await this.plugin.openDialog(dialogCfg);
        }
        continue;
      }

      this.plugin.log.info(`[Automation] Rule matched: ${rule.name}`);
      await this.actionExecutor.executeAll(rule.actions, event);
    }
  }
  getRegistry(): RuleRegistry {
    return this.ruleRegistry;
  }
}
