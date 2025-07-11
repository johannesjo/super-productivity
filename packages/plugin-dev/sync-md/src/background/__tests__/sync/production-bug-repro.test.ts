import { parseMarkdown } from '../../sync/markdown-parser';
import { generateTaskOperations } from '../../sync/generate-task-operations';
import { Task, BatchTaskUpdate } from '@super-productivity/plugin-api';

describe('Production Bug Reproduction', () => {
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

  it('should reproduce the exact production bug from the logs', () => {
    // This is the exact markdown from the current state
    const markdown = `- [ ] <!--xXKqQdbDd5dwtvHafeNCP--> a
  - [ ] <!--J51QnQgFUpIfoyAdKn-oh--> b
  - [ ] <!--GjNKThCMkJqC4rMp-e21u--> d
- [ ] <!--4ZIjvUyRiS687bpwqdVa9--> c`;

    const parsedTasks = parseMarkdown(markdown);
    console.log('=== PARSED TASKS ===');
    parsedTasks.forEach((task) => {
      console.log(
        `${task.title} (${task.id}): parentId=${task.parentId}, isSubtask=${task.isSubtask}`,
      );
    });

    // This represents the current SP state based on the logs
    const existingSpTasks: Task[] = [
      createMockTask({
        id: 'xXKqQdbDd5dwtvHafeNCP',
        title: 'a',
        parentId: null,
        subTaskIds: [
          'J51QnQgFUpIfoyAdKn-oh',
          'GjNKThCMkJqC4rMp-e21u',
          '4ZIjvUyRiS687bpwqdVa9',
        ], // c is still here!
      }),
      createMockTask({
        id: 'J51QnQgFUpIfoyAdKn-oh',
        title: 'b',
        parentId: 'xXKqQdbDd5dwtvHafeNCP',
        subTaskIds: [],
      }),
      createMockTask({
        id: 'GjNKThCMkJqC4rMp-e21u',
        title: 'd',
        parentId: 'xXKqQdbDd5dwtvHafeNCP',
        subTaskIds: [],
      }),
      createMockTask({
        id: '4ZIjvUyRiS687bpwqdVa9',
        title: 'c',
        parentId: 'xXKqQdbDd5dwtvHafeNCP', // Still thinks it's a subtask of a
        subTaskIds: [],
      }),
    ];

    console.log('=== EXISTING SP TASKS ===');
    existingSpTasks.forEach((task) => {
      console.log(
        `${task.title} (${task.id}): parentId=${task.parentId}, subTaskIds=${JSON.stringify(task.subTaskIds)}`,
      );
    });

    const operations = generateTaskOperations(
      parsedTasks,
      existingSpTasks,
      'INBOX_PROJECT',
    );
    console.log('=== GENERATED OPERATIONS ===');
    operations.forEach((op) => {
      if (op.type === 'update') {
        console.log(`Update ${op.taskId}: ${JSON.stringify(op.updates)}`);
      } else {
        console.log(`${op.type}: ${JSON.stringify(op)}`);
      }
    });

    // Find the update operations
    const updateOps = operations.filter(
      (op) => op.type === 'update',
    ) as BatchTaskUpdate[];

    // Task c should be moved to root level (parentId: null)
    const taskCUpdate = updateOps.find((op) => op.taskId === '4ZIjvUyRiS687bpwqdVa9');
    console.log('=== TASK C UPDATE ===', taskCUpdate);
    expect(taskCUpdate?.updates.parentId).toBe(null);

    // CRITICAL: Task a should have task c removed from its subTaskIds
    const taskAUpdate = updateOps.find((op) => op.taskId === 'xXKqQdbDd5dwtvHafeNCP');
    console.log('=== TASK A UPDATE ===', taskAUpdate);
    expect(taskAUpdate).toBeDefined();
    expect(taskAUpdate?.updates.subTaskIds).toEqual([
      'J51QnQgFUpIfoyAdKn-oh',
      'GjNKThCMkJqC4rMp-e21u',
    ]);
  });

  it('should handle the intermediate state where c was moved to root', () => {
    // This tests the scenario where c has already been moved to root but is still in a's subTaskIds
    const markdown = `- [ ] <!--xXKqQdbDd5dwtvHafeNCP--> a
  - [ ] <!--J51QnQgFUpIfoyAdKn-oh--> b
  - [ ] <!--GjNKThCMkJqC4rMp-e21u--> d
- [ ] <!--4ZIjvUyRiS687bpwqdVa9--> c`;

    const parsedTasks = parseMarkdown(markdown);

    // SP state where c has been moved to root but still in a's subTaskIds
    const existingSpTasks: Task[] = [
      createMockTask({
        id: 'xXKqQdbDd5dwtvHafeNCP',
        title: 'a',
        parentId: null,
        subTaskIds: [
          'J51QnQgFUpIfoyAdKn-oh',
          'GjNKThCMkJqC4rMp-e21u',
          '4ZIjvUyRiS687bpwqdVa9',
        ], // c is still here!
      }),
      createMockTask({
        id: 'J51QnQgFUpIfoyAdKn-oh',
        title: 'b',
        parentId: 'xXKqQdbDd5dwtvHafeNCP',
        subTaskIds: [],
      }),
      createMockTask({
        id: 'GjNKThCMkJqC4rMp-e21u',
        title: 'd',
        parentId: 'xXKqQdbDd5dwtvHafeNCP',
        subTaskIds: [],
      }),
      createMockTask({
        id: '4ZIjvUyRiS687bpwqdVa9',
        title: 'c',
        parentId: null, // c is already at root level
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

    // Task c should NOT have a parent update since it's already at root level
    const taskCUpdate = updateOps.find((op) => op.taskId === '4ZIjvUyRiS687bpwqdVa9');
    console.log('Task C update (should be undefined):', taskCUpdate);

    // CRITICAL: Task a should still have task c removed from its subTaskIds
    const taskAUpdate = updateOps.find((op) => op.taskId === 'xXKqQdbDd5dwtvHafeNCP');
    console.log('Task A update (should remove c from subTaskIds):', taskAUpdate);
    expect(taskAUpdate).toBeDefined();
    expect(taskAUpdate?.updates.subTaskIds).toEqual([
      'J51QnQgFUpIfoyAdKn-oh',
      'GjNKThCMkJqC4rMp-e21u',
    ]);
  });
});
