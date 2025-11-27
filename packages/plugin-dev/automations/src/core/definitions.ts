import { PluginAPI } from '@super-productivity/plugin-api';
import { TaskEvent } from '../types';

export interface AutomationContext {
  plugin: PluginAPI;
}

export interface IAutomationTrigger {
  id: string; // e.g. 'taskCompleted'
  name: string;
  description?: string;
  // Checks if this trigger matches the incoming event
  matches(event: TaskEvent, value?: string): boolean;
}

export interface IAutomationCondition {
  id: string; // e.g. 'titleContains'
  name: string;
  description?: string;
  check(context: AutomationContext, event: TaskEvent, value?: string): Promise<boolean>;
}

export interface IAutomationAction {
  id: string; // e.g. 'createTask'
  name: string;
  description?: string;
  execute(context: AutomationContext, event: TaskEvent, value?: string): Promise<void>;
}
