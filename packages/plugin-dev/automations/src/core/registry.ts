import { IAutomationAction, IAutomationCondition, IAutomationTrigger } from './definitions';

export class AutomationRegistry {
  private triggers = new Map<string, IAutomationTrigger>();
  private conditions = new Map<string, IAutomationCondition>();
  private actions = new Map<string, IAutomationAction>();

  registerTrigger(trigger: IAutomationTrigger) {
    this.triggers.set(trigger.id, trigger);
  }

  getTrigger(id: string): IAutomationTrigger | undefined {
    return this.triggers.get(id);
  }

  getTriggers(): IAutomationTrigger[] {
    return Array.from(this.triggers.values());
  }

  registerCondition(condition: IAutomationCondition) {
    this.conditions.set(condition.id, condition);
  }

  getCondition(id: string): IAutomationCondition | undefined {
    return this.conditions.get(id);
  }

  getConditions(): IAutomationCondition[] {
    return Array.from(this.conditions.values());
  }

  registerAction(action: IAutomationAction) {
    this.actions.set(action.id, action);
  }

  getAction(id: string): IAutomationAction | undefined {
    return this.actions.get(id);
  }

  getActions(): IAutomationAction[] {
    return Array.from(this.actions.values());
  }
}

export const globalRegistry = new AutomationRegistry();
