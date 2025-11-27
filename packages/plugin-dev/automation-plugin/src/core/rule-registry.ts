import { AutomationRule } from '../types';
import { PluginAPI } from '@super-productivity/plugin-api';

export class RuleRegistry {
  private rules: AutomationRule[] = [];
  private plugin: PluginAPI;

  constructor(plugin: PluginAPI) {
    this.plugin = plugin;
    this.loadRules();
  }

  private async loadRules() {
    try {
      const data = await this.plugin.loadSyncedData();
      if (data) {
        this.rules = JSON.parse(data);
      } else {
        this.initDefaultRules();
        this.saveRules();
      }
    } catch (e) {
      this.plugin.log.error('Failed to load rules', e);
      this.initDefaultRules();
    }
  }

  private initDefaultRules() {
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

  async saveRules() {
    try {
      await this.plugin.persistDataSynced(JSON.stringify(this.rules));
    } catch (e) {
      this.plugin.log.error('Failed to save rules', e);
    }
  }

  getRules(): AutomationRule[] {
    return this.rules;
  }

  getEnabledRules(): AutomationRule[] {
    return this.rules.filter((r) => r.isEnabled);
  }

  async addOrUpdateRule(rule: AutomationRule) {
    const index = this.rules.findIndex((r) => r.id === rule.id);
    if (index !== -1) {
      this.rules[index] = rule;
    } else {
      this.rules.push(rule);
    }
    await this.saveRules();
  }

  async deleteRule(ruleId: string) {
    this.rules = this.rules.filter((r) => r.id !== ruleId);
    await this.saveRules();
  }

  async toggleRuleStatus(ruleId: string, isEnabled: boolean) {
    const rule = this.rules.find((r) => r.id === ruleId);
    if (rule) {
      rule.isEnabled = isEnabled;
      await this.saveRules();
    }
  }
}
