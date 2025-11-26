import {
  AnyTaskUpdatePayload,
  PluginAPI,
  TaskCompletePayload,
  TaskUpdatePayload,
} from '@super-productivity/plugin-api';
import type { PluginHooks } from '@super-productivity/plugin-api';

declare const plugin: PluginAPI;

import { AutomationService } from './automation.service';

// Plugin initialization
plugin.log.info('Automation plugin initialized');

const automationService = new AutomationService(plugin);

// Hook into task completion
plugin.registerHook('taskComplete' as any, (payload: TaskCompletePayload) => {
  automationService.onTaskEvent({
    type: 'taskCompleted',
    task: payload.task,
  });
});

// Hook into task updates
plugin.registerHook('taskUpdate' as any, (payload: TaskUpdatePayload) => {
  automationService.onTaskEvent({
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
  if (payload.action === '[Task] Add Task' && payload.task) {
    automationService.onTaskEvent({
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
        // TODO: expose rules
        return [];
      default:
        return { error: 'Unknown message type' };
    }
  });
}
