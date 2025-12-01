import { parseMarkdown } from '../../sync/markdown-parser';
import { generateTaskOperations } from '../../sync/generate-task-operations';
import { Task, BatchTaskUpdate } from '@super-productivity/plugin-api';

describe('Subtask to Parent Cleanup', () => {
  // Helper to create mock task
  const createMockTask = (overrides: Partial<Task> = {}): Task =>
    ({
      id: 'default-id',
      title: 'Default Task',
      isDone: false,
      projectId: 'INBOX_PROJECT',
      parentId: null,
      subTaskIds: [],
      timeEstimate: 0,
      timeSpent: 0,
      tagIds: [],
      created: Date.now(),
      ...overrides,
    }) as unknown as Task;

  it('should remove former subtasks from parent subTaskIds when they become parent tasks', () => {
    // In this scenario, "Task B" was previously a subtask of "Task A"
    // But now "Task B" has become a parent task with its own subtasks
    const markdown = `- [ ] <!--taskA--> Task A
- [ ] <!--taskB--> Task B
  - [ ] <!--taskC--> Task C (child of B)
  - [ ] <!--taskD--> Task D (child of B)`;

    const parsedTasks = parseMarkdown(markdown);

    // This represents the current SP state where Task B is still a subtask of Task A
    const existingSpTasks: Task[] = [
      createMockTask({
        id: 'taskA',
        title: 'Task A',
        parentId: null,
        subTaskIds: ['taskB'], // Task B is still listed as a subtask
      }),
      createMockTask({
        id: 'taskB',
        title: 'Task B',
        parentId: 'taskA', // Task B still thinks it's a subtask
        subTaskIds: [], // Task B doesn't have its subtasks yet
      }),
      createMockTask({
        id: 'taskC',
        title: 'Task C (child of B)',
        parentId: null, // Task C thinks it's at root level
        subTaskIds: [],
      }),
      createMockTask({
        id: 'taskD',
        title: 'Task D (child of B)',
        parentId: null, // Task D thinks it's at root level
        subTaskIds: [],
      }),
    ];

    const operations = generateTaskOperations(
      parsedTasks,
      existingSpTasks,
      'INBOX_PROJECT',
    );

    // Find the update operations
    const updateOps = operations.filter(
      (op) => op.type === 'update',
    ) as BatchTaskUpdate[];

    // Task B should be moved to root level (parentId: null)
    const taskBUpdate = updateOps.find((op) => op.taskId === 'taskB');
    expect(taskBUpdate?.updates.parentId).toBe(null);

    // Task C should become a child of Task B
    const taskCUpdate = updateOps.find((op) => op.taskId === 'taskC');
    expect(taskCUpdate?.updates.parentId).toBe('taskB');

    // Task D should become a child of Task B
    const taskDUpdate = updateOps.find((op) => op.taskId === 'taskD');
    expect(taskDUpdate?.updates.parentId).toBe('taskB');

    // CRITICAL: Task A should have Task B removed from its subTaskIds
    const taskAUpdate = updateOps.find((op) => op.taskId === 'taskA');
    console.log('Task A update operation:', taskAUpdate);
    expect(taskAUpdate).toBeDefined();
    expect(taskAUpdate?.updates.subTaskIds).toEqual([]);

    // Task B should get its new subtasks
    expect(taskBUpdate?.updates.subTaskIds).toEqual(['taskC', 'taskD']);
  });

  it('should handle complex subtask-to-parent transitions', () => {
    // More complex scenario: multiple tasks changing hierarchy
    const markdown = `- [ ] <!--root1--> Root 1
- [ ] <!--former-sub1--> Former Sub 1 (now parent)
  - [ ] <!--new-child1--> New Child 1
  - [ ] <!--new-child2--> New Child 2
- [ ] <!--former-sub2--> Former Sub 2 (now parent)
  - [ ] <!--new-child3--> New Child 3`;

    const parsedTasks = parseMarkdown(markdown);

    // Current SP state: former-sub1 and former-sub2 are subtasks of root1
    const existingSpTasks: Task[] = [
      createMockTask({
        id: 'root1',
        title: 'Root 1',
        parentId: null,
        subTaskIds: ['former-sub1', 'former-sub2'], // Both are still subtasks
      }),
      createMockTask({
        id: 'former-sub1',
        title: 'Former Sub 1 (now parent)',
        parentId: 'root1', // Still thinks it's a subtask
        subTaskIds: [],
      }),
      createMockTask({
        id: 'former-sub2',
        title: 'Former Sub 2 (now parent)',
        parentId: 'root1', // Still thinks it's a subtask
        subTaskIds: [],
      }),
      createMockTask({
        id: 'new-child1',
        title: 'New Child 1',
        parentId: null,
        subTaskIds: [],
      }),
      createMockTask({
        id: 'new-child2',
        title: 'New Child 2',
        parentId: null,
        subTaskIds: [],
      }),
      createMockTask({
        id: 'new-child3',
        title: 'New Child 3',
        parentId: null,
        subTaskIds: [],
      }),
    ];

    const operations = generateTaskOperations(
      parsedTasks,
      existingSpTasks,
      'INBOX_PROJECT',
    );
    const updateOps = operations.filter(
      (op) => op.type === 'update',
    ) as BatchTaskUpdate[];

    // Root 1 should have both former subtasks removed
    const root1Update = updateOps.find((op) => op.taskId === 'root1');
    expect(root1Update?.updates.subTaskIds).toEqual([]);

    // Former subtasks should become root level and gain their own subtasks
    const formerSub1Update = updateOps.find((op) => op.taskId === 'former-sub1');
    expect(formerSub1Update?.updates.parentId).toBe(null);
    expect(formerSub1Update?.updates.subTaskIds).toEqual(['new-child1', 'new-child2']);

    const formerSub2Update = updateOps.find((op) => op.taskId === 'former-sub2');
    expect(formerSub2Update?.updates.parentId).toBe(null);
    expect(formerSub2Update?.updates.subTaskIds).toEqual(['new-child3']);
  });
});
