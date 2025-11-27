import {
  AnyTaskUpdatePayload,
  PluginAPI,
  TaskCompletePayload,
  TaskUpdatePayload,
} from '@super-productivity/plugin-api';
import type { PluginHooks } from '@super-productivity/plugin-api';

declare const plugin: PluginAPI;

import { AutomationManager } from './core/automation-manager';
import { globalRegistry } from './core/registry';
import { TASK_SHARED_ADD_TASK_ACTION } from './core/definitions';

// Plugin initialization
plugin.log.info('Automation plugin initialized');

const automationManager = new AutomationManager(plugin);

// Hook into task completion
plugin.registerHook('taskComplete' as any, (payload: TaskCompletePayload) => {
  if (!payload.task) {
    plugin.log.warn('Received taskComplete hook without task data');
    return;
  }
  automationManager.onTaskEvent({
    type: 'taskCompleted',
    task: payload.task,
  });
});

// Hook into task updates
plugin.registerHook('taskUpdate' as any, (payload: TaskUpdatePayload) => {
  if (!payload.task) {
    plugin.log.warn('Received taskUpdate hook without task data');
    return;
  }
  const isCreationEvent = !payload.changes || Object.keys(payload.changes).length === 0;
  if (isCreationEvent) {
    plugin.log.info('[Automation] Skipping taskUpdate hook for creation event');
    return;
  }
  automationManager.onTaskEvent({
    type: 'taskUpdated',
    task: payload.task,
    previousTaskState: undefined, // TODO: How to get previous state? Payload changes only has partial.
  });
});

// Hook into task creation?
// There is no explicit TASK_CREATE hook in PluginHooks enum from types.ts (Step 23).
// We might need to infer it or use ANY_TASK_UPDATE or check if there is a missing hook.
// Looking at types.ts: TASK_COMPLETE, TASK_UPDATE, TASK_DELETE, CURRENT_TASK_CHANGE, FINISH_DAY, ...
// Wait, is there no TASK_CREATE?
// Let's check if ANY_TASK_UPDATE covers creation.
// Or maybe we need to request a new hook.
// For now, let's assume we can't easily detect creation unless we monitor ANY_TASK_UPDATE and check if it's new?
// Actually, `addTask` returns a promise with ID.
// But if the user creates a task via UI, the plugin needs to know.
// Let's check if `TASK_UPDATE` is fired on creation? Usually creation is separate.
// If TASK_CREATE is missing, I should note it.
// However, the user request explicitly asked for "Task created" trigger.
// I will use `ANY_TASK_UPDATE` and check if I can detect creation, or just leave a comment.
// Actually, let's look at `PluginHooks` again.
// Step 23: TASK_COMPLETE, TASK_UPDATE, TASK_DELETE, CURRENT_TASK_CHANGE, FINISH_DAY, LANGUAGE_CHANGE, PERSISTED_DATA_UPDATE, ACTION, ANY_TASK_UPDATE, PROJECT_LIST_UPDATE.
// No TASK_CREATE.
// Maybe `ANY_TASK_UPDATE` with a specific action?
// `AnyTaskUpdatePayload` has `action`, `taskId`, `task`, `changes`.
// If `action` is 'ADD', that might be it.

plugin.registerHook('anyTaskUpdate' as any, (payload: AnyTaskUpdatePayload) => {
  // Check for creation
  // This is a guess on the action name, need to verify or be defensive.
  // Common Redux/NgRx actions: '[Task] Add Task'
  // Log all actions for debugging
  plugin.log.info(`[Automation] anyTaskUpdate action: ${payload.action}`);

  if (payload.action === TASK_SHARED_ADD_TASK_ACTION && payload.task) {
    automationManager.onTaskEvent({
      type: 'taskCreated',
      task: payload.task,
    });
  }
});

// Register UI commands
if (plugin.onMessage) {
  plugin.onMessage(async (message: any) => {
    switch (message?.type) {
      case 'getRules':
        return await automationManager.getRegistry().getRules();
      case 'getDefinitions':
        return {
          triggers: globalRegistry
            .getTriggers()
            .map((t) => ({ id: t.id, name: t.name, description: t.description })),
          conditions: globalRegistry
            .getConditions()
            .map((c) => ({ id: c.id, name: c.name, description: c.description })),
          actions: globalRegistry
            .getActions()
            .map((a) => ({ id: a.id, name: a.name, description: a.description })),
        };
      case 'saveRule':
        await automationManager.getRegistry().addOrUpdateRule(message.payload);
        return { success: true };
      case 'deleteRule':
        await automationManager.getRegistry().deleteRule(message.payload.id);
        return { success: true };
      case 'toggleRuleStatus':
        await automationManager
          .getRegistry()
          .toggleRuleStatus(message.payload.id, message.payload.isEnabled);
        return { success: true };
      case 'getProjects':
        return await plugin.getAllProjects();
      case 'getTags':
        return await plugin.getAllTags();
      case 'downloadFile':
        await plugin.downloadFile(message.payload.filename, message.payload.data);
        return { success: true };
      default:
        return { error: 'Unknown message type' };
    }
  });
}
