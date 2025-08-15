import { parseMarkdown } from '../../sync/markdown-parser';
import { generateTaskOperations } from '../../sync/generate-task-operations';
import { Task, BatchTaskUpdate } from '@super-productivity/plugin-api';

describe('Parent Change Cleanup', () => {
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

  it('should handle subtask ordering logic not re-adding cleaned up tasks', () => {
    // This test specifically targets the bug in the subtask ordering logic
    // where tasks are re-added to their old parent's subTaskIds
    const markdown = `- [ ] <!--parent1--> Parent 1
  - [ ] <!--child1--> Child 1
- [ ] <!--parent2--> Parent 2
  - [ ] <!--child2--> Child 2 (moved from parent1)`;

    const parsedTasks = parseMarkdown(markdown);
    console.log(
      'Parsed tasks:',
      parsedTasks.map((t) => ({
        title: t.title,
        id: t.id,
        parentId: t.parentId,
        isSubtask: t.isSubtask,
      })),
    );

    // Current SP state: child2 is still a subtask of parent1
    const existingSpTasks: Task[] = [
      createMockTask({
        id: 'parent1',
        title: 'Parent 1',
        parentId: null,
        subTaskIds: ['child1', 'child2'], // child2 is still here
      }),
      createMockTask({
        id: 'child1',
        title: 'Child 1',
        parentId: 'parent1',
        subTaskIds: [],
      }),
      createMockTask({
        id: 'parent2',
        title: 'Parent 2',
        parentId: null,
        subTaskIds: [], // parent2 doesn't have child2 yet
      }),
      createMockTask({
        id: 'child2',
        title: 'Child 2 (moved from parent1)',
        parentId: 'parent1', // child2 still thinks it belongs to parent1
        subTaskIds: [],
      }),
    ];

    const operations = generateTaskOperations(
      parsedTasks,
      existingSpTasks,
      'INBOX_PROJECT',
    );
    console.log(
      'All operations:',
      operations.map((op) => ({
        type: op.type,
        taskId:
          op.type === 'update' ? op.taskId : op.type === 'delete' ? op.taskId : 'N/A',
        updates: op.type === 'update' ? op.updates : undefined,
      })),
    );

    // Find the update operations
    const updateOps = operations.filter(
      (op) => op.type === 'update',
    ) as BatchTaskUpdate[];

    // child2 should be moved to parent2
    const child2Update = updateOps.find((op) => op.taskId === 'child2');
    expect(child2Update?.updates.parentId).toBe('parent2');

    // parent1 should only have child1 in its subTaskIds (child2 should be removed)
    const parent1Update = updateOps.find((op) => op.taskId === 'parent1');
    console.log('Parent1 update:', parent1Update);
    expect(parent1Update?.updates.subTaskIds).toEqual(['child1']);

    // parent2 should have child2 in its subTaskIds
    const parent2Update = updateOps.find((op) => op.taskId === 'parent2');
    console.log('Parent2 update:', parent2Update);
    expect(parent2Update?.updates.subTaskIds).toEqual(['child2']);
  });

  it('should not re-add tasks that changed parents during subtask ordering', () => {
    // Even more specific test - task moves between parents, both with existing subtasks
    const markdown = `- [ ] <!--parentA--> Parent A
  - [ ] <!--childA1--> Child A1
  - [ ] <!--childA2--> Child A2
- [ ] <!--parentB--> Parent B
  - [ ] <!--childB1--> Child B1
  - [ ] <!--movedChild--> Moved Child (was in A, now in B)`;

    const parsedTasks = parseMarkdown(markdown);

    // Current SP state: movedChild is still in parentA's subTaskIds
    const existingSpTasks: Task[] = [
      createMockTask({
        id: 'parentA',
        title: 'Parent A',
        parentId: null,
        subTaskIds: ['childA1', 'childA2', 'movedChild'], // movedChild still here
      }),
      createMockTask({
        id: 'childA1',
        title: 'Child A1',
        parentId: 'parentA',
        subTaskIds: [],
      }),
      createMockTask({
        id: 'childA2',
        title: 'Child A2',
        parentId: 'parentA',
        subTaskIds: [],
      }),
      createMockTask({
        id: 'parentB',
        title: 'Parent B',
        parentId: null,
        subTaskIds: ['childB1'], // doesn't have movedChild yet
      }),
      createMockTask({
        id: 'childB1',
        title: 'Child B1',
        parentId: 'parentB',
        subTaskIds: [],
      }),
      createMockTask({
        id: 'movedChild',
        title: 'Moved Child (was in A, now in B)',
        parentId: 'parentA', // still thinks it belongs to parentA
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

    // movedChild should be moved to parentB
    const movedChildUpdate = updateOps.find((op) => op.taskId === 'movedChild');
    expect(movedChildUpdate?.updates.parentId).toBe('parentB');

    // parentA should NOT have movedChild in its subTaskIds
    const parentAUpdate = updateOps.find((op) => op.taskId === 'parentA');
    console.log('ParentA update:', parentAUpdate);
    expect(parentAUpdate?.updates.subTaskIds).toEqual(['childA1', 'childA2']);

    // parentB should have both childB1 and movedChild
    const parentBUpdate = updateOps.find((op) => op.taskId === 'parentB');
    console.log('ParentB update:', parentBUpdate);
    expect(parentBUpdate?.updates.subTaskIds).toEqual(['childB1', 'movedChild']);
  });
});
