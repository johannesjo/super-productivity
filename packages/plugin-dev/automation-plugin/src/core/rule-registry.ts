import { AutomationRule } from '../types';

export class RuleRegistry {
  private rules: AutomationRule[] = [];

  constructor() {
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

  getRules(): AutomationRule[] {
    return this.rules;
  }

  getEnabledRules(): AutomationRule[] {
    return this.rules.filter((r) => r.isEnabled);
  }

  // Future: addRule, updateRule, deleteRule, save/load
}
