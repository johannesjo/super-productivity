import { Task } from '@super-productivity/plugin-api';

export type AutomationTriggerType = 'taskCompleted' | 'taskCreated' | 'taskUpdated';

export interface AutomationTrigger {
  type: AutomationTriggerType;
}

export interface TaskEvent {
  type: AutomationTriggerType;
  task: Task;
  previousTaskState?: Task; // only used for "updated"
}

export type ConditionType = 'titleContains' | 'projectIs' | 'hasTag';

export interface Condition {
  type: ConditionType;
  value: string;
}

export type ActionType = 'createTask' | 'addTag';

export interface Action {
  type: ActionType;
  value: string; // For createTask: title; For addTag: tagId/title
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: AutomationTrigger;
  conditions: Condition[];
  actions: Action[];
  isEnabled: boolean;
}
