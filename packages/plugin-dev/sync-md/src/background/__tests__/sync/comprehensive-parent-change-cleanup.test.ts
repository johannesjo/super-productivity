import { parseMarkdown } from '../../sync/markdown-parser';
import { generateTaskOperations } from '../../sync/generate-task-operations';
import { Task, BatchTaskUpdate } from '@super-productivity/plugin-api';

describe('Comprehensive Parent Change Cleanup', () => {
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

  it('should remove tasks from old parent subTaskIds when they change to ANY new parent', () => {
    // Test ALL types of parent changes:
    // 1. subtask -> root level
    // 2. subtask -> different parent
    // 3. root level -> subtask
    const markdown = `- [ ] <!--root1--> Root 1
- [ ] <!--root2--> Root 2
  - [ ] <!--child1--> Child 1 (was root, now subtask)
- [ ] <!--root3--> Root 3 (was subtask of root1)
- [ ] <!--parent1--> Parent 1
  - [ ] <!--child2--> Child 2 (moved from root1 to parent1)`;

    const parsedTasks = parseMarkdown(markdown);

    // Current SP state with old parent relationships
    const existingSpTasks: Task[] = [
      createMockTask({
        id: 'root1',
        title: 'Root 1',
        parentId: null,
        subTaskIds: ['root3', 'child2'], // Both will be removed
      }),
      createMockTask({
        id: 'root2',
        title: 'Root 2',
        parentId: null,
        subTaskIds: [], // Will gain child1
      }),
      createMockTask({
        id: 'child1',
        title: 'Child 1 (was root, now subtask)',
        parentId: null, // Will become subtask of root2
        subTaskIds: [],
      }),
      createMockTask({
        id: 'root3',
        title: 'Root 3 (was subtask of root1)',
        parentId: 'root1', // Will become root level
        subTaskIds: [],
      }),
      createMockTask({
        id: 'parent1',
        title: 'Parent 1',
        parentId: null,
        subTaskIds: [], // Will gain child2
      }),
      createMockTask({
        id: 'child2',
        title: 'Child 2 (moved from root1 to parent1)',
        parentId: 'root1', // Will move to parent1
        subTaskIds: [],
      }),
    ];

    console.log('=== Testing Comprehensive Parent Change Cleanup ===');
    const operations = generateTaskOperations(
      parsedTasks,
      existingSpTasks,
      'INBOX_PROJECT',
    );
    const updateOps = operations.filter(
      (op) => op.type === 'update',
    ) as BatchTaskUpdate[];

    // Verify parent changes
    const child1Update = updateOps.find((op) => op.taskId === 'child1');
    expect(child1Update?.updates.parentId).toBe('root2');

    const root3Update = updateOps.find((op) => op.taskId === 'root3');
    expect(root3Update?.updates.parentId).toBe(null);

    const child2Update = updateOps.find((op) => op.taskId === 'child2');
    expect(child2Update?.updates.parentId).toBe('parent1');

    // CRITICAL: Check that old parents have cleaned up subTaskIds
    const root1Update = updateOps.find((op) => op.taskId === 'root1');
    console.log('Root1 update (should have empty subTaskIds):', root1Update);
    expect(root1Update?.updates.subTaskIds).toEqual([]);

    // Check that new parents get the correct subTaskIds
    const root2Update = updateOps.find((op) => op.taskId === 'root2');
    console.log('Root2 update (should have child1):', root2Update);
    expect(root2Update?.updates.subTaskIds).toEqual(['child1']);

    const parent1Update = updateOps.find((op) => op.taskId === 'parent1');
    console.log('Parent1 update (should have child2):', parent1Update);
    expect(parent1Update?.updates.subTaskIds).toEqual(['child2']);
  });

  it('should handle simpler hierarchy reorganization', () => {
    // Test verifies that the core fix works: tasks that change parents are removed from old parent's subTaskIds
    const markdown = `- [ ] <!--A--> A
  - [ ] <!--B--> B (was child of C)
- [ ] <!--C--> C (was child of A)
  - [ ] <!--D--> D (was root level)`;

    const parsedTasks = parseMarkdown(markdown);

    // Current SP state - different from target
    const existingSpTasks: Task[] = [
      createMockTask({
        id: 'A',
        title: 'A',
        parentId: null,
        subTaskIds: ['C'], // C will be removed
      }),
      createMockTask({
        id: 'B',
        title: 'B (was child of C)',
        parentId: 'C', // Will become child of A
        subTaskIds: [],
      }),
      createMockTask({
        id: 'C',
        title: 'C (was child of A)',
        parentId: 'A', // Will become root level
        subTaskIds: ['B'], // Will lose B, gain D
      }),
      createMockTask({
        id: 'D',
        title: 'D (was root level)',
        parentId: null, // Will become child of C
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

    // Verify parent changes
    const bUpdate = updateOps.find((op) => op.taskId === 'B');
    expect(bUpdate?.updates.parentId).toBe('A');

    const cUpdate = updateOps.find((op) => op.taskId === 'C');
    expect(cUpdate?.updates.parentId).toBe(null);

    const dUpdate = updateOps.find((op) => op.taskId === 'D');
    expect(dUpdate?.updates.parentId).toBe('C');

    // Check that cleanup worked - A should no longer have C as subtask
    const aUpdate = updateOps.find((op) => op.taskId === 'A');
    expect(aUpdate?.updates.subTaskIds).toEqual(['B']);

    // C should have D as subtask (after being cleaned up from having B)
    expect(cUpdate?.updates.subTaskIds).toEqual(['D']);
  });
});
