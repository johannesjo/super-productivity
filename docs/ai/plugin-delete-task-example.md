# Plugin API deleteTask Implementation

## Overview

Added the `deleteTask` method implementation to the PluginAPI, allowing plugins to delete tasks programmatically.

## Implementation Details

### 1. PluginAPI Class (`/src/app/plugins/plugin-api.ts`)

Added the `deleteTask` method that delegates to the PluginBridgeService:

```typescript
async deleteTask(taskId: string): Promise<void> {
  console.log(`Plugin ${this._pluginId} requested to delete task ${taskId}`);
  return this._pluginBridge.deleteTask(taskId);
}
```

### 2. PluginBridgeService (`/src/app/plugins/plugin-bridge.service.ts`)

Implemented the actual deletion logic:

```typescript
async deleteTask(taskId: string): Promise<void> {
  typia.assert<string>(taskId);

  try {
    // Get the task with its subtasks
    const taskWithSubTasks = await this._store
      .select(selectTaskByIdWithSubTaskData, { id: taskId })
      .pipe(first())
      .toPromise();

    if (!taskWithSubTasks) {
      throw new Error(
        this._translateService.instant(T.PLUGINS.TASK_NOT_FOUND, { taskId }),
      );
    }

    // Use the TaskService remove method which handles deletion properly
    this._taskService.remove(taskWithSubTasks);

    console.log('PluginBridge: Task deleted successfully', {
      taskId,
      hadSubTasks: taskWithSubTasks.subTasks.length > 0,
    });
  } catch (error) {
    console.error('PluginBridge: Failed to delete task:', error);
    throw error;
  }
}
```

## Key Features

1. **Task Validation**: Checks if the task exists before attempting deletion
2. **Subtask Handling**: Automatically handles deletion of subtasks when a parent task is deleted
3. **Error Handling**: Provides clear error messages when task is not found
4. **Logging**: Logs successful deletions with information about subtasks

## Usage Example

Here's how a plugin would use the deleteTask method:

```typescript
// In a plugin's code
async function cleanupOldTasks(api: PluginAPI) {
  try {
    // Get all tasks
    const tasks = await api.getTasks();

    // Find tasks older than 30 days that are marked as done
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const oldDoneTasks = tasks.filter(
      (task) => task.isDone && task.doneOn && task.doneOn < thirtyDaysAgo,
    );

    // Delete each old task
    for (const task of oldDoneTasks) {
      await api.deleteTask(task.id);
      console.log(`Deleted old task: ${task.title}`);
    }

    api.showSnack({
      msg: `Cleaned up ${oldDoneTasks.length} old tasks`,
      type: 'SUCCESS',
    });
  } catch (error) {
    console.error('Failed to cleanup tasks:', error);
    api.showSnack({
      msg: 'Failed to cleanup old tasks',
      type: 'ERROR',
    });
  }
}
```

## Technical Notes

- The method uses the existing `TaskService.remove()` method which properly handles all the NgRx state updates
- The `selectTaskByIdWithSubTaskData` selector is used to get the task with all its subtasks
- The method is async to handle the observable conversion properly
- Type validation is performed using Typia to ensure the taskId is a string
