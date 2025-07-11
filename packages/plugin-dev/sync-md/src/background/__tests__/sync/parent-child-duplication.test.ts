import { parseMarkdown } from '../../sync/markdown-parser';
import { generateTaskOperations } from '../../sync/generate-task-operations';
import { convertTasksToMarkdown } from '../../sync/sp-to-md';
import { Task, BatchTaskCreate, BatchTaskUpdate } from '@super-productivity/plugin-api';

describe('Parent-Child Relationship Duplication Bug', () => {
  it('should not duplicate subtasks under multiple parents', () => {
    const markdown = `- [ ] <!--FLiJU6wLhQEmAA49Ym0a4--> whaaaat
- [ ] <!--xXKqQdbDd5dwtvHafeNCP--> yeah
  - [ ] <!--Qme9-Sdf7U-Zb7GR-WNpl--> cool
  - [ ] <!--J51QnQgFUpIfoyAdKn-oh--> it is working very well`;

    const parsedTasks = parseMarkdown(markdown);

    // Verify correct parsing
    expect(parsedTasks).toHaveLength(4);

    // Find tasks by ID
    const whaaaat = parsedTasks.find((t) => t.id === 'FLiJU6wLhQEmAA49Ym0a4');
    const yeah = parsedTasks.find((t) => t.id === 'xXKqQdbDd5dwtvHafeNCP');
    const cool = parsedTasks.find((t) => t.id === 'Qme9-Sdf7U-Zb7GR-WNpl');
    const working = parsedTasks.find((t) => t.id === 'J51QnQgFUpIfoyAdKn-oh');

    expect(whaaaat).toBeDefined();
    expect(yeah).toBeDefined();
    expect(cool).toBeDefined();
    expect(working).toBeDefined();

    // Verify parent-child relationships
    expect(whaaaat!.parentId).toBeNull();
    expect(yeah!.parentId).toBeNull();
    expect(cool!.parentId).toBe('xXKqQdbDd5dwtvHafeNCP'); // cool should be child of yeah
    expect(working!.parentId).toBe('xXKqQdbDd5dwtvHafeNCP'); // working should be child of yeah
  });

  it('should generate correct operations without duplicating subtasks', () => {
    const markdown = `- [ ] <!--FLiJU6wLhQEmAA49Ym0a4--> whaaaat
- [ ] <!--xXKqQdbDd5dwtvHafeNCP--> yeah
  - [ ] <!--Qme9-Sdf7U-Zb7GR-WNpl--> cool
  - [ ] <!--J51QnQgFUpIfoyAdKn-oh--> it is working very well`;

    const parsedTasks = parseMarkdown(markdown);

    // Simulate empty SP state (all tasks are new)
    const spTasks: Task[] = [];

    const operations = generateTaskOperations(parsedTasks, spTasks, 'INBOX_PROJECT');

    // Should create 4 tasks total
    const createOps = operations.filter(
      (op) => op.type === 'create',
    ) as BatchTaskCreate[];
    expect(createOps).toHaveLength(4);

    // Verify each task is created with correct parent
    const wheeeeatCreate = createOps.find((op) => op.data.title === 'whaaaat');
    const yeahCreate = createOps.find((op) => op.data.title === 'yeah');
    const coolCreate = createOps.find((op) => op.data.title === 'cool');
    const workingCreate = createOps.find(
      (op) => op.data.title === 'it is working very well',
    );

    expect(wheeeeatCreate).toBeDefined();
    expect(yeahCreate).toBeDefined();
    expect(coolCreate).toBeDefined();
    expect(workingCreate).toBeDefined();

    // Verify parent relationships in create operations
    expect(wheeeeatCreate!.data.parentId).toBeUndefined();
    expect(yeahCreate!.data.parentId).toBeUndefined();
    expect(coolCreate!.data.parentId).toBe('xXKqQdbDd5dwtvHafeNCP');
    expect(workingCreate!.data.parentId).toBe('xXKqQdbDd5dwtvHafeNCP');
  });

  it('should handle the exact scenario from the bug report', () => {
    const markdown = `- [ ] <!--FLiJU6wLhQEmAA49Ym0a4--> whaaaat
- [ ] <!--xXKqQdbDd5dwtvHafeNCP--> yeah
  - [ ] <!--Qme9-Sdf7U-Zb7GR-WNpl--> cool
  - [ ] <!--J51QnQgFUpIfoyAdKn-oh--> it is working very well`;

    const parsedTasks = parseMarkdown(markdown);

    // After creating these tasks in SP, verify the structure
    const spTasks: Task[] = [
      {
        id: 'FLiJU6wLhQEmAA49Ym0a4',
        title: 'whaaaat',
        isDone: false,
        projectId: 'INBOX_PROJECT',
        parentId: null,
        subTaskIds: [], // Should NOT have subtasks
        timeEstimate: 0,
        timeSpent: 0,
        tagIds: [],
        created: Date.now(),
      } as unknown as Task,
      {
        id: 'xXKqQdbDd5dwtvHafeNCP',
        title: 'yeah',
        isDone: false,
        projectId: 'INBOX_PROJECT',
        parentId: null,
        subTaskIds: ['Qme9-Sdf7U-Zb7GR-WNpl', 'J51QnQgFUpIfoyAdKn-oh'], // Should have these subtasks
        timeEstimate: 0,
        timeSpent: 0,
        tagIds: [],
        created: Date.now(),
      } as unknown as Task,
      {
        id: 'Qme9-Sdf7U-Zb7GR-WNpl',
        title: 'cool',
        isDone: false,
        projectId: 'INBOX_PROJECT',
        parentId: 'xXKqQdbDd5dwtvHafeNCP',
        subTaskIds: [],
        timeEstimate: 0,
        timeSpent: 0,
        tagIds: [],
        created: Date.now(),
      } as unknown as Task,
      {
        id: 'J51QnQgFUpIfoyAdKn-oh',
        title: 'it is working very well',
        isDone: false,
        projectId: 'INBOX_PROJECT',
        parentId: 'xXKqQdbDd5dwtvHafeNCP',
        subTaskIds: [],
        timeEstimate: 0,
        timeSpent: 0,
        tagIds: [],
        created: Date.now(),
      } as unknown as Task,
    ];

    // Run sync again with existing tasks
    const operations = generateTaskOperations(parsedTasks, spTasks, 'INBOX_PROJECT');

    // Should not create any duplicate tasks
    const createOps = operations.filter((op) => op.type === 'create');
    expect(createOps).toHaveLength(0);

    // Should not update parent relationships incorrectly
    const updateOps = operations.filter(
      (op) => op.type === 'update',
    ) as BatchTaskUpdate[];
    const incorrectParentUpdates = updateOps.filter(
      (op) => op.updates.parentId !== undefined,
    );
    expect(incorrectParentUpdates).toHaveLength(0);
  });

  it('should not duplicate subtasks when converting SP tasks back to markdown', () => {
    // This test reproduces the exact bug scenario
    const spTasks: Task[] = [
      {
        id: 'FLiJU6wLhQEmAA49Ym0a4',
        title: 'whaaaat',
        isDone: false,
        projectId: 'INBOX_PROJECT',
        parentId: null,
        subTaskIds: [], // whaaaat has no children
        timeEstimate: 0,
        timeSpent: 0,
        tagIds: [],
        created: Date.now(),
      } as unknown as Task,
      {
        id: 'xXKqQdbDd5dwtvHafeNCP',
        title: 'yeah',
        isDone: false,
        projectId: 'INBOX_PROJECT',
        parentId: null,
        subTaskIds: ['Qme9-Sdf7U-Zb7GR-WNpl', 'J51QnQgFUpIfoyAdKn-oh'], // yeah has 2 children
        timeEstimate: 0,
        timeSpent: 0,
        tagIds: [],
        created: Date.now(),
      } as unknown as Task,
      {
        id: 'Qme9-Sdf7U-Zb7GR-WNpl',
        title: 'cool',
        isDone: false,
        projectId: 'INBOX_PROJECT',
        parentId: 'xXKqQdbDd5dwtvHafeNCP', // child of yeah
        subTaskIds: [],
        timeEstimate: 0,
        timeSpent: 0,
        tagIds: [],
        created: Date.now(),
      } as unknown as Task,
      {
        id: 'J51QnQgFUpIfoyAdKn-oh',
        title: 'it is working very well',
        isDone: false,
        projectId: 'INBOX_PROJECT',
        parentId: 'xXKqQdbDd5dwtvHafeNCP', // child of yeah
        subTaskIds: [],
        timeEstimate: 0,
        timeSpent: 0,
        tagIds: [],
        created: Date.now(),
      } as unknown as Task,
    ];

    const markdown = convertTasksToMarkdown(spTasks);

    // The markdown should NOT duplicate the subtasks
    const lines = markdown.split('\n').filter((line) => line.trim());

    // Count occurrences of each task
    const whaaaatCount = lines.filter((line) => line.includes('whaaaat')).length;
    const yeahCount = lines.filter((line) => line.includes('yeah')).length;
    const coolCount = lines.filter((line) => line.includes('cool')).length;
    const workingCount = lines.filter((line) =>
      line.includes('it is working very well'),
    ).length;

    expect(whaaaatCount).toBe(1);
    expect(yeahCount).toBe(1);
    expect(coolCount).toBe(1);
    expect(workingCount).toBe(1);

    // Verify the structure is correct
    expect(markdown).toContain('- [ ] <!--FLiJU6wLhQEmAA49Ym0a4--> whaaaat');
    expect(markdown).toContain('- [ ] <!--xXKqQdbDd5dwtvHafeNCP--> yeah');
    expect(markdown).toContain('  - [ ] <!--Qme9-Sdf7U-Zb7GR-WNpl--> cool');
    expect(markdown).toContain(
      '  - [ ] <!--J51QnQgFUpIfoyAdKn-oh--> it is working very well',
    );
  });

  it('should handle indent changes correctly when syncing from markdown', () => {
    // Test the scenario where indent size changes during editing
    // Using consistent 2-space indentation
    const markdown1 = `- [ ] <!--FLiJU6wLhQEmAA49Ym0a4--> whaaaat
  - [ ] <!--xXKqQdbDd5dwtvHafeNCP--> yeah
  - [ ] <!--Qme9-Sdf7U-Zb7GR-WNpl--> cool
  - [ ] <!--J51QnQgFUpIfoyAdKn-oh--> it is working very well`;

    const parsed1 = parseMarkdown(markdown1);

    // All three should be children of whaaaat in this structure
    const yeah1 = parsed1.find((t) => t.id === 'xXKqQdbDd5dwtvHafeNCP');
    const cool1 = parsed1.find((t) => t.id === 'Qme9-Sdf7U-Zb7GR-WNpl');
    const working1 = parsed1.find((t) => t.id === 'J51QnQgFUpIfoyAdKn-oh');
    expect(yeah1?.parentId).toBe('FLiJU6wLhQEmAA49Ym0a4');
    expect(cool1?.parentId).toBe('FLiJU6wLhQEmAA49Ym0a4');
    expect(working1?.parentId).toBe('FLiJU6wLhQEmAA49Ym0a4');

    // Now change the indent structure - yeah becomes a sibling
    const markdown2 = `- [ ] <!--FLiJU6wLhQEmAA49Ym0a4--> whaaaat
- [ ] <!--xXKqQdbDd5dwtvHafeNCP--> yeah
  - [ ] <!--Qme9-Sdf7U-Zb7GR-WNpl--> cool
  - [ ] <!--J51QnQgFUpIfoyAdKn-oh--> it is working very well`;

    const parsed2 = parseMarkdown(markdown2);

    // yeah should now be sibling of whaaaat
    const yeah2 = parsed2.find((t) => t.id === 'xXKqQdbDd5dwtvHafeNCP');
    expect(yeah2?.parentId).toBeNull();

    // cool and working should be children of yeah
    const cool2 = parsed2.find((t) => t.id === 'Qme9-Sdf7U-Zb7GR-WNpl');
    const working2 = parsed2.find((t) => t.id === 'J51QnQgFUpIfoyAdKn-oh');
    expect(cool2?.parentId).toBe('xXKqQdbDd5dwtvHafeNCP');
    expect(working2?.parentId).toBe('xXKqQdbDd5dwtvHafeNCP');
  });
});
