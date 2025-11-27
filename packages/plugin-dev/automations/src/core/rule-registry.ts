import { AutomationRule } from '../types';
import { PluginAPI } from '@super-productivity/plugin-api';

export class RuleRegistry {
  private rules: AutomationRule[] = [];
  private plugin: PluginAPI;
  private initPromise: Promise<void>;
  private saveQueue: Promise<void> = Promise.resolve();

  constructor(plugin: PluginAPI) {
    this.plugin = plugin;
    this.initPromise = this.loadRules();
  }

  private async loadRules() {
    try {
      const data = await this.plugin.loadSyncedData();
      if (data) {
        this.rules = JSON.parse(data);
      } else {
        this.initDefaultRules();
        await this.saveRules();
      }
    } catch (e) {
      this.plugin.log.error('Failed to load rules', e);
      this.initDefaultRules();
    }
  }

  private initDefaultRules() {
    // Hardcoded example rules for MVP
    this.rules = [];
  }

  private async saveRules() {
    this.saveQueue = this.saveQueue.then(async () => {
      try {
        await this.plugin.persistDataSynced(JSON.stringify(this.rules));
      } catch (e) {
        this.plugin.log.error('Failed to save rules', e);
      }
    });
    await this.saveQueue;
  }

  async getRules(): Promise<AutomationRule[]> {
    await this.initPromise;
    return this.rules;
  }

  async getEnabledRules(): Promise<AutomationRule[]> {
    await this.initPromise;
    return this.rules.filter((r) => r.isEnabled);
  }

  async addOrUpdateRule(rule: AutomationRule) {
    await this.initPromise;
    this.saveQueue = this.saveQueue.then(async () => {
      const index = this.rules.findIndex((r) => r.id === rule.id);
      if (index !== -1) {
        this.rules[index] = rule;
      } else {
        this.rules.push(rule);
      }
      try {
        await this.plugin.persistDataSynced(JSON.stringify(this.rules));
      } catch (e) {
        this.plugin.log.error('Failed to save rules', e);
      }
    });
    await this.saveQueue;
  }

  async deleteRule(ruleId: string) {
    await this.initPromise;
    this.saveQueue = this.saveQueue.then(async () => {
      this.rules = this.rules.filter((r) => r.id !== ruleId);
      try {
        await this.plugin.persistDataSynced(JSON.stringify(this.rules));
      } catch (e) {
        this.plugin.log.error('Failed to save rules', e);
      }
    });
    await this.saveQueue;
  }

  async toggleRuleStatus(ruleId: string, isEnabled: boolean) {
    await this.initPromise;
    this.saveQueue = this.saveQueue.then(async () => {
      const rule = this.rules.find((r) => r.id === ruleId);
      if (rule) {
        rule.isEnabled = isEnabled;
        try {
          await this.plugin.persistDataSynced(JSON.stringify(this.rules));
        } catch (e) {
          this.plugin.log.error('Failed to save rules', e);
        }
      }
    });
    await this.saveQueue;
  }
}
