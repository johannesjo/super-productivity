import { replicateTasks } from './replicateTasks';
import { MarkdownTask, SuperProductivityTask } from './types';

describe('replicateTasks', () => {
  const projectId = 'test-project';

  it('should create new tasks in SP when markdown has tasks without IDs', () => {
    const markdownContent = `# Tasks\n- [ ] Task 1\n- [x] Task 2`;
    const markdownTasks: MarkdownTask[] = [
      { line: '- [ ] Task 1', lineNumber: 1, title: 'Task 1', isDone: false },
      { line: '- [x] Task 2', lineNumber: 2, title: 'Task 2', isDone: true },
    ];
    const spTasks: SuperProductivityTask[] = [];

    const result = replicateTasks(markdownContent, markdownTasks, spTasks, projectId);

    expect(result.superProductivityUpdates).toHaveLength(2);
    expect(result.superProductivityUpdates[0]).toMatchObject({
      type: 'create',
      task: {
        title: 'Task 1',
        isDone: false,
        projectId,
      },
    });
    expect(result.superProductivityUpdates[1]).toMatchObject({
      type: 'create',
      task: {
        title: 'Task 2',
        isDone: true,
        projectId,
      },
    });
    expect(result.stats).toEqual({ created: 2, updated: 0, deleted: 0 });

    // Check markdown was updated with IDs
    expect(result.markdownContent).toContain('<!-- sp:task-');
    expect(result.markdownContent.split('<!-- sp:').length).toBe(3); // 1 + 2 tasks
  });

  it('should update tasks when title or status changed', () => {
    const markdownContent = `- [ ] <!-- sp:task-001 --> Updated Title\n- [x] <!-- sp:task-002 --> Task 2`;
    const markdownTasks: MarkdownTask[] = [
      {
        line: '- [ ] <!-- sp:task-001 --> Updated Title',
        lineNumber: 0,
        id: 'task-001',
        title: 'Updated Title',
        isDone: false,
      },
      {
        line: '- [x] <!-- sp:task-002 --> Task 2',
        lineNumber: 1,
        id: 'task-002',
        title: 'Task 2',
        isDone: true,
      },
    ];
    const spTasks: SuperProductivityTask[] = [
      { id: 'task-001', title: 'Old Title', isDone: false, projectId },
      { id: 'task-002', title: 'Task 2', isDone: false, projectId },
    ];

    const result = replicateTasks(markdownContent, markdownTasks, spTasks, projectId);

    expect(result.superProductivityUpdates).toHaveLength(2);
    expect(result.superProductivityUpdates[0]).toEqual({
      type: 'update',
      id: 'task-001',
      task: {
        title: 'Updated Title',
        isDone: false,
      },
    });
    expect(result.superProductivityUpdates[1]).toEqual({
      type: 'update',
      id: 'task-002',
      task: {
        title: 'Task 2',
        isDone: true,
      },
    });
    expect(result.stats).toEqual({ created: 0, updated: 2, deleted: 0 });

    // Markdown should remain unchanged
    expect(result.markdownContent).toBe(markdownContent);
  });

  it('should delete SP tasks not present in markdown', () => {
    const markdownContent = `- [ ] <!-- sp:task-001 --> Task 1`;
    const markdownTasks: MarkdownTask[] = [
      {
        line: '- [ ] <!-- sp:task-001 --> Task 1',
        lineNumber: 0,
        id: 'task-001',
        title: 'Task 1',
        isDone: false,
      },
    ];
    const spTasks: SuperProductivityTask[] = [
      { id: 'task-001', title: 'Task 1', isDone: false, projectId },
      { id: 'task-002', title: 'Task 2', isDone: false, projectId },
      { id: 'task-003', title: 'Task 3', isDone: true, projectId },
    ];

    const result = replicateTasks(markdownContent, markdownTasks, spTasks, projectId);

    expect(result.superProductivityUpdates).toHaveLength(2);
    expect(result.superProductivityUpdates[0]).toEqual({
      type: 'delete',
      id: 'task-002',
    });
    expect(result.superProductivityUpdates[1]).toEqual({
      type: 'delete',
      id: 'task-003',
    });
    expect(result.stats).toEqual({ created: 0, updated: 0, deleted: 2 });
  });

  it('should handle mixed operations', () => {
    const markdownContent = [
      '- [ ] <!-- sp:task-001 --> Keep unchanged',
      '- [x] <!-- sp:task-002 --> Update status',
      '- [ ] New task without ID',
    ].join('\n');

    const markdownTasks: MarkdownTask[] = [
      {
        line: '- [ ] <!-- sp:task-001 --> Keep unchanged',
        lineNumber: 0,
        id: 'task-001',
        title: 'Keep unchanged',
        isDone: false,
      },
      {
        line: '- [x] <!-- sp:task-002 --> Update status',
        lineNumber: 1,
        id: 'task-002',
        title: 'Update status',
        isDone: true,
      },
      {
        line: '- [ ] New task without ID',
        lineNumber: 2,
        title: 'New task without ID',
        isDone: false,
      },
    ];

    const spTasks: SuperProductivityTask[] = [
      { id: 'task-001', title: 'Keep unchanged', isDone: false, projectId },
      { id: 'task-002', title: 'Update status', isDone: false, projectId },
      { id: 'task-003', title: 'Delete this', isDone: false, projectId },
    ];

    const result = replicateTasks(markdownContent, markdownTasks, spTasks, projectId);

    // Should have 1 update, 1 create, 1 delete
    expect(result.superProductivityUpdates).toHaveLength(3);

    const updates = result.superProductivityUpdates;
    expect(updates.find((u) => u.type === 'update')).toEqual({
      type: 'update',
      id: 'task-002',
      task: { title: 'Update status', isDone: true },
    });
    expect(updates.find((u) => u.type === 'create')).toMatchObject({
      type: 'create',
      task: { title: 'New task without ID', isDone: false, projectId },
    });
    expect(updates.find((u) => u.type === 'delete')).toEqual({
      type: 'delete',
      id: 'task-003',
    });

    expect(result.stats).toEqual({ created: 1, updated: 1, deleted: 1 });

    // Check that line 2 was updated with an ID
    const lines = result.markdownContent.split('\n');
    expect(lines[2]).toContain('<!-- sp:task-');
    expect(lines[2]).toContain('New task without ID');
  });

  it('should handle empty states', () => {
    const markdownContent = '';
    const markdownTasks: MarkdownTask[] = [];
    const spTasks: SuperProductivityTask[] = [];

    const result = replicateTasks(markdownContent, markdownTasks, spTasks, projectId);

    expect(result.superProductivityUpdates).toHaveLength(0);
    expect(result.stats).toEqual({ created: 0, updated: 0, deleted: 0 });
    expect(result.markdownContent).toBe('');
  });

  it('should preserve SP metadata during updates', () => {
    const markdownContent = `- [ ] <!-- sp:task-001 --> Task 1`;
    const markdownTasks: MarkdownTask[] = [
      {
        line: '- [ ] <!-- sp:task-001 --> Task 1',
        lineNumber: 0,
        id: 'task-001',
        title: 'Task 1',
        isDone: false,
      },
    ];
    const spTasks: SuperProductivityTask[] = [
      {
        id: 'task-001',
        title: 'Task 1',
        isDone: false,
        projectId,
        timeSpent: 3600,
        tags: ['important'],
        attachments: ['file1.pdf'],
      },
    ];

    const result = replicateTasks(markdownContent, markdownTasks, spTasks, projectId);

    // No updates needed since title and isDone match
    expect(result.superProductivityUpdates).toHaveLength(0);
    expect(result.stats).toEqual({ created: 0, updated: 0, deleted: 0 });
  });

  it('should handle tasks with ID but not in SP (recovery scenario)', () => {
    const markdownContent = `- [ ] <!-- sp:lost-task --> Lost task`;
    const markdownTasks: MarkdownTask[] = [
      {
        line: '- [ ] <!-- sp:lost-task --> Lost task',
        lineNumber: 0,
        id: 'lost-task',
        title: 'Lost task',
        isDone: false,
      },
    ];
    const spTasks: SuperProductivityTask[] = [];

    const result = replicateTasks(markdownContent, markdownTasks, spTasks, projectId);

    expect(result.superProductivityUpdates).toHaveLength(1);
    expect(result.superProductivityUpdates[0]).toEqual({
      type: 'create',
      task: {
        id: 'lost-task',
        title: 'Lost task',
        isDone: false,
        projectId,
      },
    });
    expect(result.stats).toEqual({ created: 1, updated: 0, deleted: 0 });
  });

  it('should handle tasks with parent-child relationships', () => {
    const markdownContent = [
      '- [ ] <!-- sp:parent-1 --> Parent task',
      '  - [ ] <!-- sp:child-1 --> Child task 1',
      '  - [x] <!-- sp:child-2 --> Child task 2',
      '- [ ] <!-- sp:parent-2 --> Another parent',
    ].join('\n');

    const markdownTasks: MarkdownTask[] = [
      {
        line: '- [ ] <!-- sp:parent-1 --> Parent task',
        lineNumber: 0,
        id: 'parent-1',
        title: 'Parent task',
        isDone: false,
        indentLevel: 0,
      },
      {
        line: '  - [ ] <!-- sp:child-1 --> Child task 1',
        lineNumber: 1,
        id: 'child-1',
        title: 'Child task 1',
        isDone: false,
        indentLevel: 1,
        parentId: 'parent-1',
      },
      {
        line: '  - [x] <!-- sp:child-2 --> Child task 2',
        lineNumber: 2,
        id: 'child-2',
        title: 'Child task 2',
        isDone: true,
        indentLevel: 1,
        parentId: 'parent-1',
      },
      {
        line: '- [ ] <!-- sp:parent-2 --> Another parent',
        lineNumber: 3,
        id: 'parent-2',
        title: 'Another parent',
        isDone: false,
        indentLevel: 0,
      },
    ];

    const spTasks: SuperProductivityTask[] = [
      { id: 'parent-1', title: 'Parent task', isDone: false, projectId },
      {
        id: 'child-1',
        title: 'Child task 1',
        isDone: false,
        projectId,
        parentId: 'parent-1',
      },
      {
        id: 'child-2',
        title: 'Child task 2',
        isDone: false,
        projectId,
        parentId: 'parent-1',
      },
      { id: 'parent-2', title: 'Another parent', isDone: false, projectId },
    ];

    const result = replicateTasks(markdownContent, markdownTasks, spTasks, projectId);

    // Should update child-2's isDone status
    expect(result.superProductivityUpdates).toHaveLength(1);
    expect(result.superProductivityUpdates[0]).toEqual({
      type: 'update',
      id: 'child-2',
      task: { title: 'Child task 2', isDone: true },
    });
    expect(result.stats).toEqual({ created: 0, updated: 1, deleted: 0 });
  });

  it('should handle tasks with special markdown characters in titles', () => {
    const markdownContent = [
      '- [ ] Task with **bold** text',
      '- [ ] Task with _italic_ text',
      '- [ ] Task with `code` blocks',
      '- [ ] Task with [link](http://example.com)',
      '- [ ] Task with * and - characters',
    ].join('\n');

    const markdownTasks: MarkdownTask[] = [
      {
        line: '- [ ] Task with **bold** text',
        lineNumber: 0,
        title: 'Task with **bold** text',
        isDone: false,
      },
      {
        line: '- [ ] Task with _italic_ text',
        lineNumber: 1,
        title: 'Task with _italic_ text',
        isDone: false,
      },
      {
        line: '- [ ] Task with `code` blocks',
        lineNumber: 2,
        title: 'Task with `code` blocks',
        isDone: false,
      },
      {
        line: '- [ ] Task with [link](http://example.com)',
        lineNumber: 3,
        title: 'Task with [link](http://example.com)',
        isDone: false,
      },
      {
        line: '- [ ] Task with * and - characters',
        lineNumber: 4,
        title: 'Task with * and - characters',
        isDone: false,
      },
    ];

    const spTasks: SuperProductivityTask[] = [];

    const result = replicateTasks(markdownContent, markdownTasks, spTasks, projectId);

    expect(result.superProductivityUpdates).toHaveLength(5);
    expect(result.stats).toEqual({ created: 5, updated: 0, deleted: 0 });

    // Verify special characters are preserved
    expect(result.superProductivityUpdates[0].task?.title).toBe(
      'Task with **bold** text',
    );
    expect(result.superProductivityUpdates[1].task?.title).toBe(
      'Task with _italic_ text',
    );
    expect(result.superProductivityUpdates[2].task?.title).toBe(
      'Task with `code` blocks',
    );
    expect(result.superProductivityUpdates[3].task?.title).toBe(
      'Task with [link](http://example.com)',
    );
    expect(result.superProductivityUpdates[4].task?.title).toBe(
      'Task with * and - characters',
    );
  });

  it('should handle very long task titles', () => {
    const longTitle = 'A'.repeat(500);
    const markdownContent = `- [ ] ${longTitle}`;

    const markdownTasks: MarkdownTask[] = [
      {
        line: `- [ ] ${longTitle}`,
        lineNumber: 0,
        title: longTitle,
        isDone: false,
      },
    ];

    const spTasks: SuperProductivityTask[] = [];

    const result = replicateTasks(markdownContent, markdownTasks, spTasks, projectId);

    expect(result.superProductivityUpdates).toHaveLength(1);
    expect(result.superProductivityUpdates[0].task?.title).toBe(longTitle);
    expect(result.stats).toEqual({ created: 1, updated: 0, deleted: 0 });
  });

  it('should handle tasks from different projects correctly', () => {
    const markdownContent = `- [ ] <!-- sp:task-001 --> Task for this project`;
    const markdownTasks: MarkdownTask[] = [
      {
        line: '- [ ] <!-- sp:task-001 --> Task for this project',
        lineNumber: 0,
        id: 'task-001',
        title: 'Task for this project',
        isDone: false,
      },
    ];

    // Include tasks from different projects
    const spTasks: SuperProductivityTask[] = [
      { id: 'task-001', title: 'Task for this project', isDone: false, projectId },
      {
        id: 'other-task-1',
        title: 'Task from other project',
        isDone: false,
        projectId: 'other-project',
      },
      {
        id: 'other-task-2',
        title: 'Another task from other project',
        isDone: true,
        projectId: 'other-project',
      },
    ];

    const result = replicateTasks(markdownContent, markdownTasks, spTasks, projectId);

    // The function will delete tasks that aren't in markdown
    // Tasks from other projects should be filtered before calling this function
    expect(result.superProductivityUpdates).toHaveLength(2);
    expect(result.superProductivityUpdates[0].type).toBe('delete');
    expect(result.superProductivityUpdates[1].type).toBe('delete');
    expect(result.stats).toEqual({ created: 0, updated: 0, deleted: 2 });
  });

  it('should handle markdown content with non-task lines', () => {
    const markdownContent = [
      '# Project Header',
      '',
      'Some description text',
      '',
      '- [ ] Task 1',
      '- Regular list item (not a task)',
      '- [x] Task 2',
      '',
      '## Section header',
      '- [ ] Task 3',
    ].join('\n');

    const markdownTasks: MarkdownTask[] = [
      {
        line: '- [ ] Task 1',
        lineNumber: 4,
        title: 'Task 1',
        isDone: false,
      },
      {
        line: '- [x] Task 2',
        lineNumber: 6,
        title: 'Task 2',
        isDone: true,
      },
      {
        line: '- [ ] Task 3',
        lineNumber: 9,
        title: 'Task 3',
        isDone: false,
      },
    ];

    const spTasks: SuperProductivityTask[] = [];

    const result = replicateTasks(markdownContent, markdownTasks, spTasks, projectId);

    expect(result.superProductivityUpdates).toHaveLength(3);
    expect(result.stats).toEqual({ created: 3, updated: 0, deleted: 0 });

    // Verify non-task lines are preserved
    const lines = result.markdownContent.split('\n');
    expect(lines[0]).toBe('# Project Header');
    expect(lines[2]).toBe('Some description text');
    expect(lines[5]).toBe('- Regular list item (not a task)');
    expect(lines[8]).toBe('## Section header');
  });

  it('should handle concurrent modifications during replication', () => {
    const markdownContent = `- [ ] Task 1\n- [ ] Task 2`;
    const markdownTasks: MarkdownTask[] = [
      {
        line: '- [ ] Task 1',
        lineNumber: 0,
        title: 'Task 1',
        isDone: false,
      },
      {
        line: '- [ ] Task 2',
        lineNumber: 1,
        title: 'Task 2',
        isDone: false,
      },
    ];

    // Simulate SP tasks being modified during replication
    const spTasks: SuperProductivityTask[] = [
      { id: 'existing-task', title: 'This will be deleted', isDone: false, projectId },
    ];

    const result = replicateTasks(markdownContent, markdownTasks, spTasks, projectId);

    // Should handle gracefully
    expect(result.superProductivityUpdates).toHaveLength(3); // 2 creates, 1 delete
    expect(result.stats).toEqual({ created: 2, updated: 0, deleted: 1 });
  });
});
