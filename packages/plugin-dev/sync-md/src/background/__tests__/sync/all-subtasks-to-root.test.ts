import { parseMarkdown } from '../../sync/markdown-parser';
import { generateTaskOperations } from '../../sync/generate-task-operations';
import { Task, BatchTaskUpdate } from '@super-productivity/plugin-api';

describe('All Subtasks Converted to Root Level', () => {
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

  it('should clean up all subtasks when they are all moved to root level', () => {
    // This is the exact scenario from the user's current markdown
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

    // Current SP state where b, d, and c are all subtasks of a
    const existingSpTasks: Task[] = [
      createMockTask({
        id: 'xXKqQdbDd5dwtvHafeNCP',
        title: 'a',
        parentId: null,
        subTaskIds: [
          'J51QnQgFUpIfoyAdKn-oh',
          'GjNKThCMkJqC4rMp-e21u',
          '4ZIjvUyRiS687bpwqdVa9',
        ], // has all as subtasks
      }),
      createMockTask({
        id: 'J51QnQgFUpIfoyAdKn-oh',
        title: 'b',
        parentId: 'xXKqQdbDd5dwtvHafeNCP', // is subtask of a
        subTaskIds: [],
      }),
      createMockTask({
        id: 'GjNKThCMkJqC4rMp-e21u',
        title: 'd',
        parentId: 'xXKqQdbDd5dwtvHafeNCP', // is subtask of a
        subTaskIds: [],
      }),
      createMockTask({
        id: '4ZIjvUyRiS687bpwqdVa9',
        title: 'c',
        parentId: 'xXKqQdbDd5dwtvHafeNCP', // is subtask of a
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

    // All tasks (b, d, c) should be moved to root level
    const taskBUpdate = updateOps.find((op) => op.taskId === 'J51QnQgFUpIfoyAdKn-oh');
    console.log('=== TASK B UPDATE ===', taskBUpdate);
    expect(taskBUpdate?.updates.parentId).toBe(null);

    const taskDUpdate = updateOps.find((op) => op.taskId === 'GjNKThCMkJqC4rMp-e21u');
    console.log('=== TASK D UPDATE ===', taskDUpdate);
    expect(taskDUpdate?.updates.parentId).toBe(null);

    const taskCUpdate = updateOps.find((op) => op.taskId === '4ZIjvUyRiS687bpwqdVa9');
    console.log('=== TASK C UPDATE ===', taskCUpdate);
    expect(taskCUpdate?.updates.parentId).toBe(null);

    // CRITICAL: Task a should have ALL subtasks removed from its subTaskIds
    const taskAUpdate = updateOps.find((op) => op.taskId === 'xXKqQdbDd5dwtvHafeNCP');
    console.log('=== TASK A UPDATE ===', taskAUpdate);
    expect(taskAUpdate).toBeDefined();
    expect(taskAUpdate?.updates.subTaskIds).toEqual([]);
  });

  it('should handle the case where only one subtask remains and others are moved to root', () => {
    // Test where one subtask stays but others move to root
    const markdown = `- [ ] <!--parent--> Parent
  - [ ] <!--stays--> Stays as subtask
- [ ] <!--moves1--> Moves to root 1
- [ ] <!--moves2--> Moves to root 2`;

    const parsedTasks = parseMarkdown(markdown);

    // Current SP state where all are subtasks
    const existingSpTasks: Task[] = [
      createMockTask({
        id: 'parent',
        title: 'Parent',
        parentId: null,
        subTaskIds: ['stays', 'moves1', 'moves2'], // has all as subtasks initially
      }),
      createMockTask({
        id: 'stays',
        title: 'Stays as subtask',
        parentId: 'parent',
        subTaskIds: [],
      }),
      createMockTask({
        id: 'moves1',
        title: 'Moves to root 1',
        parentId: 'parent', // will move to root
        subTaskIds: [],
      }),
      createMockTask({
        id: 'moves2',
        title: 'Moves to root 2',
        parentId: 'parent', // will move to root
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

    // Parent should only have 'stays' in subTaskIds
    const parentUpdate = updateOps.find((op) => op.taskId === 'parent');
    console.log('Parent update:', parentUpdate);
    expect(parentUpdate?.updates.subTaskIds).toEqual(['stays']);

    // moves1 and moves2 should be moved to root
    const moves1Update = updateOps.find((op) => op.taskId === 'moves1');
    expect(moves1Update?.updates.parentId).toBe(null);

    const moves2Update = updateOps.find((op) => op.taskId === 'moves2');
    expect(moves2Update?.updates.parentId).toBe(null);
  });
});
