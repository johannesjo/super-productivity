import { parseMarkdown } from '../../sync/markdown-parser';
import { generateTaskOperations } from '../../sync/generate-task-operations';
import { convertTasksToMarkdown } from '../../sync/sp-to-md';
import { Task, BatchTaskUpdate } from '@super-productivity/plugin-api';

describe('Subtask Cleanup Issue', () => {
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

  it('should clean up subTaskIds when tasks are moved to root level', () => {
    // This reproduces the exact bug scenario from the logs
    const markdown = `- [ ] <!--xXKqQdbDd5dwtvHafeNCP--> yeah2
- [ ] <!--J51QnQgFUpIfoyAdKn-oh--> it is working very well
- [ ] <!--FLiJU6wLhQEmAA49Ym0a4--> whaaaat
- [ ] <!--t5G8kLAj_59m_H1kH6BRJ--> wnat
- [ ] <!--_pWKsWwgiE1OPLlXcXNEG--> a
- [ ] <!--6KK7EQ9mn_ru07-PI_zv7--> cool
- [ ] <!--Br9iiblg_as1Kx-uwv5pf--> bujt this works rather well`;

    const parsedTasks = parseMarkdown(markdown);

    // All tasks should be at root level (no parents)
    expect(parsedTasks.every((task) => task.parentId === null)).toBe(true);

    // Simulate SP state where tasks were previously subtasks of "whaaaat"
    const existingSpTasks: Task[] = [
      createMockTask({
        id: 'xXKqQdbDd5dwtvHafeNCP',
        title: 'yeah2',
        parentId: null,
        subTaskIds: [],
      }),
      createMockTask({
        id: 'J51QnQgFUpIfoyAdKn-oh',
        title: 'it is working very well',
        parentId: null,
        subTaskIds: [],
      }),
      createMockTask({
        id: 'FLiJU6wLhQEmAA49Ym0a4',
        title: 'whaaaat',
        parentId: null,
        subTaskIds: [
          't5G8kLAj_59m_H1kH6BRJ',
          '_pWKsWwgiE1OPLlXcXNEG',
          '6KK7EQ9mn_ru07-PI_zv7',
        ], // Still has old subtasks
      }),
      createMockTask({
        id: 't5G8kLAj_59m_H1kH6BRJ',
        title: 'wnat',
        parentId: 'FLiJU6wLhQEmAA49Ym0a4', // Still thinks it's a subtask
        subTaskIds: [],
      }),
      createMockTask({
        id: '_pWKsWwgiE1OPLlXcXNEG',
        title: 'a',
        parentId: 'FLiJU6wLhQEmAA49Ym0a4', // Still thinks it's a subtask
        subTaskIds: [],
      }),
      createMockTask({
        id: '6KK7EQ9mn_ru07-PI_zv7',
        title: 'cool',
        parentId: 'FLiJU6wLhQEmAA49Ym0a4', // Still thinks it's a subtask
        subTaskIds: [],
      }),
      createMockTask({
        id: 'Br9iiblg_as1Kx-uwv5pf',
        title: 'bujt this works rather well',
        parentId: null,
        subTaskIds: [],
      }),
    ];

    const operations = generateTaskOperations(
      parsedTasks,
      existingSpTasks,
      'INBOX_PROJECT',
    );

    // Find update operations for the moved tasks
    const updateOps = operations.filter(
      (op) => op.type === 'update',
    ) as BatchTaskUpdate[];

    // Should update moved tasks to have null parentId
    const wnatUpdate = updateOps.find((op) => op.taskId === 't5G8kLAj_59m_H1kH6BRJ');
    const aUpdate = updateOps.find((op) => op.taskId === '_pWKsWwgiE1OPLlXcXNEG');
    const coolUpdate = updateOps.find((op) => op.taskId === '6KK7EQ9mn_ru07-PI_zv7');

    expect(wnatUpdate?.updates.parentId).toBe(null);
    expect(aUpdate?.updates.parentId).toBe(null);
    expect(coolUpdate?.updates.parentId).toBe(null);

    // CRITICAL: Should clean up the old parent's subTaskIds
    const whaaaatUpdate = updateOps.find((op) => op.taskId === 'FLiJU6wLhQEmAA49Ym0a4');
    expect(whaaaatUpdate).toBeDefined();
    expect(whaaaatUpdate?.updates.subTaskIds).toEqual([]); // Should be empty now
  });

  it('should prevent task duplication when converting back to markdown', () => {
    // This simulates the buggy state where tasks appear both as root and subtasks
    const spTasks: Task[] = [
      createMockTask({
        id: 'xXKqQdbDd5dwtvHafeNCP',
        title: 'yeah2',
        parentId: null,
        subTaskIds: [],
      }),
      createMockTask({
        id: 'J51QnQgFUpIfoyAdKn-oh',
        title: 'it is working very well',
        parentId: null,
        subTaskIds: [],
      }),
      createMockTask({
        id: 'FLiJU6wLhQEmAA49Ym0a4',
        title: 'whaaaat',
        parentId: null,
        subTaskIds: [
          't5G8kLAj_59m_H1kH6BRJ',
          '_pWKsWwgiE1OPLlXcXNEG',
          '6KK7EQ9mn_ru07-PI_zv7',
        ], // Still has old subtasks
      }),
      createMockTask({
        id: 't5G8kLAj_59m_H1kH6BRJ',
        title: 'wnat',
        parentId: null, // Now at root level
        subTaskIds: [],
      }),
      createMockTask({
        id: '_pWKsWwgiE1OPLlXcXNEG',
        title: 'a',
        parentId: null, // Now at root level
        subTaskIds: [],
      }),
      createMockTask({
        id: '6KK7EQ9mn_ru07-PI_zv7',
        title: 'cool',
        parentId: null, // Now at root level
        subTaskIds: [],
      }),
      createMockTask({
        id: 'Br9iiblg_as1Kx-uwv5pf',
        title: 'bujt this works rather well',
        parentId: null,
        subTaskIds: [],
      }),
    ];

    const markdown = convertTasksToMarkdown(spTasks);
    const lines = markdown.split('\n').filter((line) => line.trim());

    // Count occurrences of each task by their specific IDs
    const wnatCount = lines.filter((line) =>
      line.includes('<!--t5G8kLAj_59m_H1kH6BRJ-->'),
    ).length;
    const aCount = lines.filter((line) =>
      line.includes('<!--_pWKsWwgiE1OPLlXcXNEG-->'),
    ).length;
    const coolCount = lines.filter((line) =>
      line.includes('<!--6KK7EQ9mn_ru07-PI_zv7-->'),
    ).length;

    // Should not be duplicated
    expect(wnatCount).toBe(1);
    expect(aCount).toBe(1);
    expect(coolCount).toBe(1);

    // "whaaaat" should not have any subtasks in markdown
    expect(markdown).toContain('- [ ] <!--FLiJU6wLhQEmAA49Ym0a4--> whaaaat');
    // The tasks should be at root level, not indented under whaaaat
    expect(markdown).toContain('- [ ] <!--t5G8kLAj_59m_H1kH6BRJ--> wnat');
    expect(markdown).toContain('- [ ] <!--_pWKsWwgiE1OPLlXcXNEG--> a');
    expect(markdown).toContain('- [ ] <!--6KK7EQ9mn_ru07-PI_zv7--> cool');
  });

  it('should handle complex parent changes with proper cleanup', () => {
    // Test moving tasks between different parents
    const markdown = `- [ ] <!--parent1--> Parent 1
  - [ ] <!--child1--> Child 1 (moved to parent1)
- [ ] <!--parent2--> Parent 2
  - [ ] <!--child2--> Child 2 (moved to parent2)
- [ ] <!--child3--> Child 3 (moved to root)`;

    const parsedTasks = parseMarkdown(markdown);

    // Simulate state where tasks had different parents
    const existingSpTasks: Task[] = [
      createMockTask({
        id: 'parent1',
        title: 'Parent 1',
        parentId: null,
        subTaskIds: ['child3'], // Used to have child3
      }),
      createMockTask({
        id: 'parent2',
        title: 'Parent 2',
        parentId: null,
        subTaskIds: ['child1', 'child2'], // Used to have both children
      }),
      createMockTask({
        id: 'child1',
        title: 'Child 1 (moved to parent1)',
        parentId: 'parent2', // Was under parent2
        subTaskIds: [],
      }),
      createMockTask({
        id: 'child2',
        title: 'Child 2 (moved to parent2)',
        parentId: 'parent2', // Stays under parent2
        subTaskIds: [],
      }),
      createMockTask({
        id: 'child3',
        title: 'Child 3 (moved to root)',
        parentId: 'parent1', // Was under parent1
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

    // parent1 should now have child1, not child3
    const parent1Update = updateOps.find((op) => op.taskId === 'parent1');
    expect(parent1Update?.updates.subTaskIds).toEqual(['child1']);

    // parent2 should now have only child2, not child1
    const parent2Update = updateOps.find((op) => op.taskId === 'parent2');
    expect(parent2Update?.updates.subTaskIds).toEqual(['child2']);

    // child1 should move to parent1
    const child1Update = updateOps.find((op) => op.taskId === 'child1');
    expect(child1Update?.updates.parentId).toBe('parent1');

    // child3 should move to root
    const child3Update = updateOps.find((op) => op.taskId === 'child3');
    expect(child3Update?.updates.parentId).toBe(null);
  });
});
