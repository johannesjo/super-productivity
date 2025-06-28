import { describe, it, expect } from '@jest/globals';
import {
  parseMarkdownToTree,
  tasksToTree,
  treeToMarkdown,
  compareTrees,
  replicateMD,
  TreeNode,
} from '../syncLogic';
import { Task } from '../types';

describe('parseMarkdownToTree', () => {
  it('should parse simple markdown checklist', () => {
    const markdown = `- [ ] Task 1
- [x] Task 2
- [ ] Task 3`;

    const result = parseMarkdownToTree(markdown);

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      title: 'Task 1',
      isDone: false,
      children: [],
      level: 0,
    });
    expect(result[1]).toMatchObject({
      title: 'Task 2',
      isDone: true,
      children: [],
      level: 0,
    });
  });

  it('should parse nested markdown checklist', () => {
    const markdown = `- [ ] Parent Task
  - [x] Child Task 1
  - [ ] Child Task 2
    - [x] Grandchild Task`;

    const result = parseMarkdownToTree(markdown);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Parent Task');
    expect(result[0].children).toHaveLength(2);
    expect(result[0].children[0].title).toBe('Child Task 1');
    expect(result[0].children[1].children).toHaveLength(1);
    expect(result[0].children[1].children[0].title).toBe('Grandchild Task');
  });

  it('should parse markdown with task IDs', () => {
    const markdown = `- [ ] (task-1) Task with ID
  - [x] (task-1-1) Subtask with ID
- [ ] (task-2) Another task`;

    const result = parseMarkdownToTree(markdown);

    expect(result[0].id).toBe('task-1');
    expect(result[0].title).toBe('Task with ID');
    expect(result[0].children[0].id).toBe('task-1-1');
    expect(result[1].id).toBe('task-2');
  });

  it('should handle both dash and asterisk bullets', () => {
    const markdown = `- [ ] Dash task
* [x] Asterisk task
  * [ ] Asterisk subtask`;

    const result = parseMarkdownToTree(markdown);

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Dash task');
    expect(result[1].title).toBe('Asterisk task');
    expect(result[1].children[0].title).toBe('Asterisk subtask');
  });

  it('should handle empty markdown', () => {
    const result = parseMarkdownToTree('');
    expect(result).toEqual([]);
  });

  it('should ignore non-checklist lines', () => {
    const markdown = `# Header
Some text
- [ ] Task 1
More text
- [x] Task 2`;

    const result = parseMarkdownToTree(markdown);

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Task 1');
    expect(result[1].title).toBe('Task 2');
  });
});

describe('tasksToTree', () => {
  it('should convert flat task list to tree', () => {
    const tasks: Task[] = [
      {
        id: '1',
        title: 'Task 1',
        isDone: false,
        projectId: 'proj1',
      },
      {
        id: '2',
        title: 'Task 2',
        isDone: true,
        projectId: 'proj1',
      },
    ];

    const result = tasksToTree(tasks);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('1');
    expect(result[0].title).toBe('Task 1');
    expect(result[1].id).toBe('2');
    expect(result[1].isDone).toBe(true);
  });

  it('should handle parent-child relationships with parentId', () => {
    const tasks: Task[] = [
      {
        id: '1',
        title: 'Parent',
        isDone: false,
        projectId: 'proj1',
      },
      {
        id: '2',
        title: 'Child',
        isDone: true,
        projectId: 'proj1',
        parentId: '1',
      },
    ];

    const result = tasksToTree(tasks);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
    expect(result[0].children).toHaveLength(1);
    expect(result[0].children[0].id).toBe('2');
  });

  it('should handle parent-child relationships with subTaskIds', () => {
    const tasks: Task[] = [
      {
        id: '1',
        title: 'Parent',
        isDone: false,
        projectId: 'proj1',
        subTaskIds: ['2', '3'],
      },
      {
        id: '2',
        title: 'Child 1',
        isDone: true,
        projectId: 'proj1',
      },
      {
        id: '3',
        title: 'Child 2',
        isDone: false,
        projectId: 'proj1',
      },
    ];

    const result = tasksToTree(tasks);

    expect(result).toHaveLength(1);
    expect(result[0].children).toHaveLength(2);
    expect(result[0].children[0].id).toBe('2');
    expect(result[0].children[1].id).toBe('3');
  });

  it('should handle tasks with notes', () => {
    const tasks: Task[] = [
      {
        id: '1',
        title: 'Task with notes',
        isDone: false,
        projectId: 'proj1',
        notes: 'This is a note\nWith multiple lines',
      },
    ];

    const result = tasksToTree(tasks);

    expect(result[0].notes).toBe('This is a note\nWith multiple lines');
  });

  it('should not duplicate children when both parentId and subTaskIds exist', () => {
    const tasks: Task[] = [
      {
        id: '1',
        title: 'Parent',
        isDone: false,
        projectId: 'proj1',
        subTaskIds: ['2'],
      },
      {
        id: '2',
        title: 'Child',
        isDone: true,
        projectId: 'proj1',
        parentId: '1',
      },
    ];

    const result = tasksToTree(tasks);

    expect(result).toHaveLength(1);
    expect(result[0].children).toHaveLength(1);
    expect(result[0].children[0].id).toBe('2');
  });
});

describe('treeToMarkdown', () => {
  it('should convert simple tree to markdown', () => {
    const tree: TreeNode[] = [
      {
        id: '1',
        title: 'Task 1',
        isDone: false,
        children: [],
        level: 0,
      },
      {
        id: '2',
        title: 'Task 2',
        isDone: true,
        children: [],
        level: 0,
      },
    ];

    // Test with IDs included
    const resultWithIds = treeToMarkdown(tree, 0, true);
    expect(resultWithIds).toBe('- [ ] (1) Task 1\n- [x] (2) Task 2');

    // Test without IDs (default)
    const resultWithoutIds = treeToMarkdown(tree);
    expect(resultWithoutIds).toBe('- [ ] Task 1\n- [x] Task 2');
  });

  it('should handle nested tree structure', () => {
    const tree: TreeNode[] = [
      {
        id: '1',
        title: 'Parent',
        isDone: false,
        children: [
          {
            id: '2',
            title: 'Child',
            isDone: true,
            children: [],
            level: 1,
          },
        ],
        level: 0,
      },
    ];

    // Test with IDs included
    const resultWithIds = treeToMarkdown(tree, 0, true);
    expect(resultWithIds).toBe('- [ ] (1) Parent\n  - [x] (2) Child');

    // Test without IDs (default)
    const resultWithoutIds = treeToMarkdown(tree);
    expect(resultWithoutIds).toBe('- [ ] Parent\n  - [x] Child');
  });

  it('should include notes as sub-items', () => {
    const tree: TreeNode[] = [
      {
        id: '1',
        title: 'Task with notes',
        isDone: false,
        children: [],
        notes: 'Note line 1\nNote line 2',
        level: 0,
      },
    ];

    // Test with IDs included
    const resultWithIds = treeToMarkdown(tree, 0, true);
    expect(resultWithIds).toBe(
      '- [ ] (1) Task with notes\n  - Note line 1\n  - Note line 2',
    );

    // Test without IDs (default)
    const resultWithoutIds = treeToMarkdown(tree);
    expect(resultWithoutIds).toBe(
      '- [ ] Task with notes\n  - Note line 1\n  - Note line 2',
    );
  });

  it('should handle nodes without IDs', () => {
    const tree: TreeNode[] = [
      {
        title: 'Task without ID',
        isDone: false,
        children: [],
        level: 0,
      },
    ];

    const result = treeToMarkdown(tree);

    expect(result).toBe('- [ ] Task without ID');
  });
});

describe('compareTrees', () => {
  it('should detect new tasks in markdown for fileToProject sync', () => {
    const markdownTree: TreeNode[] = [
      {
        title: 'New Task',
        isDone: false,
        children: [],
        level: 0,
      },
    ];
    const taskTree: TreeNode[] = [];

    const operations = compareTrees(markdownTree, taskTree, 'fileToProject');

    expect(operations).toHaveLength(1);
    expect(operations[0]).toMatchObject({
      type: 'add',
      target: 'task',
      data: {
        title: 'New Task',
        isDone: false,
      },
    });
  });

  it('should detect task updates for fileToProject sync', () => {
    const markdownTree: TreeNode[] = [
      {
        id: '1',
        title: 'Updated Task',
        isDone: true,
        children: [],
        level: 0,
      },
    ];
    const taskTree: TreeNode[] = [
      {
        id: '1',
        title: 'Original Task',
        isDone: false,
        children: [],
        level: 0,
      },
    ];

    const operations = compareTrees(markdownTree, taskTree, 'fileToProject');

    expect(operations).toHaveLength(1);
    expect(operations[0]).toMatchObject({
      type: 'update',
      target: 'task',
      taskId: '1',
      data: {
        title: 'Updated Task',
        isDone: true,
      },
    });
  });

  it('should detect new tasks in project for projectToFile sync', () => {
    const markdownTree: TreeNode[] = [];
    const taskTree: TreeNode[] = [
      {
        id: '1',
        title: 'New Project Task',
        isDone: false,
        children: [],
        level: 0,
      },
    ];

    const operations = compareTrees(markdownTree, taskTree, 'projectToFile');

    expect(operations).toHaveLength(1);
    expect(operations[0]).toMatchObject({
      type: 'add',
      target: 'markdown',
      taskId: '1',
      data: {
        title: 'New Project Task',
        isDone: false,
      },
    });
  });

  it('should handle bidirectional sync with deletions', () => {
    const markdownTree: TreeNode[] = [];
    const taskTree: TreeNode[] = [
      {
        id: '1',
        title: 'Task to delete',
        isDone: false,
        children: [],
        level: 0,
      },
    ];

    const operations = compareTrees(markdownTree, taskTree, 'bidirectional');

    expect(operations).toHaveLength(1);
    expect(operations[0]).toMatchObject({
      type: 'delete',
      target: 'task',
      taskId: '1',
    });
  });
});

describe('replicateMD', () => {
  it('should successfully sync markdown to tasks', () => {
    const markdown = `- [ ] Task 1
- [x] Task 2`;
    const tasks: Task[] = [];

    const result = replicateMD(markdown, tasks, 'fileToProject');

    expect(result.success).toBe(true);
    expect(result.tasksAdded).toBe(2);
    expect(result.tasksUpdated).toBe(0);
    expect(result.tasksDeleted).toBe(0);
  });

  it('should maintain hierarchy when syncing from project to file', () => {
    const markdown = `- [ ] test from task.md 3
  - [ ] test from task.md 4
- [ ] asd  xxxxxxxxxx`;

    const tasks: Task[] = [
      {
        id: '1',
        title: 'XXX',
        isDone: false,
        projectId: 'proj1',
      },
      {
        id: '2',
        title: 'test from task.md 3',
        isDone: false,
        projectId: 'proj1',
        subTaskIds: ['3', '4'],
      },
      {
        id: '3',
        title: 'test from task.md 4',
        isDone: false,
        projectId: 'proj1',
        parentId: '2',
      },
      {
        id: '4',
        title: 'asd  xxxxxxxxxx',
        isDone: false,
        projectId: 'proj1',
        parentId: '2',
      },
    ];

    const result = replicateMD(markdown, tasks, 'projectToFile');

    if (!result.success) {
      console.error('Sync failed:', result.error);
    }

    expect(result.success).toBe(true);
    // Use SuperProductivity's task order
    expect(result.updatedMarkdown).toBe(`- [ ] XXX
- [ ] test from task.md 3
  - [ ] test from task.md 4
  - [ ] asd  xxxxxxxxxx`);
  });

  it('should fix broken hierarchy when syncing from project to file', () => {
    // This test represents the actual issue reported:
    // markdown has broken hierarchy but SP has correct hierarchy
    const markdown = `- [ ] test from task.md 3
    - [ ] test from task.md 4
- [ ] asd  xxxxxxxxxx
- [ ] XXX`;

    const tasks: Task[] = [
      {
        id: '1',
        title: 'XXX',
        isDone: false,
        projectId: 'proj1',
      },
      {
        id: '2',
        title: 'test from task.md 3',
        isDone: false,
        projectId: 'proj1',
        subTaskIds: ['3', '4'],
      },
      {
        id: '3',
        title: 'test from task.md 4',
        isDone: false,
        projectId: 'proj1',
        parentId: '2',
      },
      {
        id: '4',
        title: 'asd  xxxxxxxxxx',
        isDone: false,
        projectId: 'proj1',
        parentId: '2',
      },
    ];

    const result = replicateMD(markdown, tasks, 'projectToFile');

    if (!result.success) {
      console.error('Sync failed:', result.error);
    }

    expect(result.success).toBe(true);
    // Use SuperProductivity's task order and hierarchy
    expect(result.updatedMarkdown).toBe(`- [ ] XXX
- [ ] test from task.md 3
  - [ ] test from task.md 4
  - [ ] asd  xxxxxxxxxx`);
  });

  it('should detect and update changed tasks', () => {
    const markdown = `- [x] (1) Task 1
- [ ] (2) Task 2`;
    const tasks: Task[] = [
      {
        id: '1',
        title: 'Task 1',
        isDone: false, // Different from markdown
        projectId: 'proj1',
      },
      {
        id: '2',
        title: 'Task 2',
        isDone: false,
        projectId: 'proj1',
      },
    ];

    const result = replicateMD(markdown, tasks, 'fileToProject');

    expect(result.success).toBe(true);
    expect(result.tasksAdded).toBe(0);
    expect(result.tasksUpdated).toBe(1);
    expect(result.operations[0]).toMatchObject({
      type: 'update',
      target: 'task',
      taskId: '1',
    });
  });

  it('should handle errors gracefully', () => {
    // Pass invalid markdown that could cause parsing error
    const markdown = null as any;
    const tasks: Task[] = [];

    const result = replicateMD(markdown, tasks, 'fileToProject');

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.tasksAdded).toBe(0);
    expect(result.tasksUpdated).toBe(0);
    expect(result.tasksDeleted).toBe(0);
  });

  it('should use SuperProductivity task order when syncing from project to file', () => {
    // Test case from user report
    const markdown = `- [ ] test from task.md 3
  - [ ] test from task.md 4
  - [ ] asd  xxxxxxxxxx
- [ ] XXX
- [ ] A`;

    const tasks: Task[] = [
      {
        id: '1',
        title: 'XXX',
        isDone: false,
        projectId: 'proj1',
      },
      {
        id: '2',
        title: 'test from task.md 3',
        isDone: false,
        projectId: 'proj1',
        subTaskIds: ['3', '4'],
      },
      {
        id: '3',
        title: 'test from task.md 4',
        isDone: false,
        projectId: 'proj1',
        parentId: '2',
      },
      {
        id: '4',
        title: 'asd  xxxxxxxxxx',
        isDone: false,
        projectId: 'proj1',
        parentId: '2',
      },
      {
        id: '5',
        title: 'A',
        isDone: false,
        projectId: 'proj1',
      },
    ];

    const result = replicateMD(markdown, tasks, 'projectToFile');

    expect(result.success).toBe(true);
    // The output should use SuperProductivity's task order (order of tasks array)
    expect(result.updatedMarkdown).toBe(`- [ ] XXX
- [ ] test from task.md 3
  - [ ] test from task.md 4
  - [ ] asd  xxxxxxxxxx
- [ ] A`);
  });

  it('should use SuperProductivity task order when syncing from project to file with different orders', () => {
    // This test reproduces the task ordering issue where:
    // - SuperProductivity has tasks in order: [XXX, test from task.md 3 (with children), A]
    // - Markdown file has them in order: [test from task.md 3 (with children), XXX, A]
    // After syncing from project to file, the markdown should use SuperProductivity's order

    const markdown = `- [ ] test from task.md 3
  - [ ] Child 1
  - [ ] Child 2
- [ ] XXX
- [ ] A`;

    const tasks: Task[] = [
      {
        id: 'task-1',
        title: 'XXX',
        isDone: false,
        projectId: 'proj1',
      },
      {
        id: 'task-2',
        title: 'test from task.md 3',
        isDone: false,
        projectId: 'proj1',
        subTaskIds: ['task-3', 'task-4'],
      },
      {
        id: 'task-3',
        title: 'Child 1',
        isDone: false,
        projectId: 'proj1',
        parentId: 'task-2',
      },
      {
        id: 'task-4',
        title: 'Child 2',
        isDone: false,
        projectId: 'proj1',
        parentId: 'task-2',
      },
      {
        id: 'task-5',
        title: 'A',
        isDone: false,
        projectId: 'proj1',
      },
    ];

    const result = replicateMD(markdown, tasks, 'projectToFile');

    expect(result.success).toBe(true);
    // The output should use SuperProductivity's order
    expect(result.updatedMarkdown).toBe(`- [ ] XXX
- [ ] test from task.md 3
  - [ ] Child 1
  - [ ] Child 2
- [ ] A`);
  });

  it('should maintain complex task ordering and hierarchy when syncing from project to file', () => {
    // More comprehensive test with multiple levels of nesting and various orderings
    const markdown = `- [ ] Task B
  - [ ] B Child 1
- [ ] Task A
- [ ] Task D
  - [ ] D Child 1
    - [ ] D Grandchild 1
  - [ ] D Child 2
- [ ] Task C`;

    const tasks: Task[] = [
      {
        id: '1',
        title: 'Task A',
        isDone: false,
        projectId: 'proj1',
      },
      {
        id: '2',
        title: 'Task B',
        isDone: false,
        projectId: 'proj1',
        subTaskIds: ['2-1'],
      },
      {
        id: '2-1',
        title: 'B Child 1',
        isDone: false,
        projectId: 'proj1',
        parentId: '2',
      },
      {
        id: '3',
        title: 'Task C',
        isDone: false,
        projectId: 'proj1',
      },
      {
        id: '4',
        title: 'Task D',
        isDone: false,
        projectId: 'proj1',
        subTaskIds: ['4-1', '4-2'],
      },
      {
        id: '4-1',
        title: 'D Child 1',
        isDone: false,
        projectId: 'proj1',
        parentId: '4',
        subTaskIds: ['4-1-1'],
      },
      {
        id: '4-1-1',
        title: 'D Grandchild 1',
        isDone: false,
        projectId: 'proj1',
        parentId: '4-1',
      },
      {
        id: '4-2',
        title: 'D Child 2',
        isDone: false,
        projectId: 'proj1',
        parentId: '4',
      },
    ];

    const result = replicateMD(markdown, tasks, 'projectToFile');

    expect(result.success).toBe(true);
    // The output should use SuperProductivity's order: A, B, C, D
    expect(result.updatedMarkdown).toBe(`- [ ] Task A
- [ ] Task B
  - [ ] B Child 1
- [ ] Task C
- [ ] Task D
  - [ ] D Child 1
    - [ ] D Grandchild 1
  - [ ] D Child 2`);
  });

  it('should sync nested tasks correctly', () => {
    const markdown = `- [ ] Parent
  - [x] Child 1
  - [ ] Child 2`;
    const tasks: Task[] = [];

    const result = replicateMD(markdown, tasks, 'fileToProject');

    expect(result.success).toBe(true);
    expect(result.tasksAdded).toBe(3);
    expect(result.operations).toHaveLength(3);

    // Parent task should be added first
    expect(result.operations[0]).toMatchObject({
      type: 'add',
      target: 'task',
      parentId: null,
      data: { title: 'Parent', isDone: false },
    });

    // Children should reference parent
    expect(result.operations[1].parentId).toBeDefined();
    expect(result.operations[2].parentId).toBeDefined();
  });

  it('should convert checklist items in subtask notes to markdown checklist sub-items', () => {
    // Example 1 from user: Checklist items in subtask notes become checklist sub-items
    const tasks: Task[] = [
      {
        id: '1',
        title: 'some parent task',
        isDone: false,
        projectId: 'proj1',
        subTaskIds: ['2', '3'],
      },
      {
        id: '2',
        title: 'some sub task',
        isDone: false,
        projectId: 'proj1',
        parentId: '1',
      },
      {
        id: '3',
        title: 'some other sub task',
        isDone: false,
        projectId: 'proj1',
        parentId: '1',
        notes:
          '- [ ] some checklist task in notes\n- [ ] some other checklist task in notes',
      },
    ];

    const result = replicateMD('', tasks, 'projectToFile');

    expect(result.success).toBe(true);
    expect(result.updatedMarkdown).toBe(`- [ ] some parent task
  - [ ] some sub task
  - [ ] some other sub task
    - [ ] some checklist task in notes
    - [ ] some other checklist task in notes`);
  });

  it('should ignore notes on parent tasks when syncing from project to file', () => {
    // Example 2 from user: Notes on parent tasks are ignored
    const tasks: Task[] = [
      {
        id: '1',
        title: 'some other parent',
        isDone: false,
        projectId: 'proj1',
        subTaskIds: ['2'],
        notes:
          '- [ ] some checklist task in notes\n- [ ] some other checklist task in notes',
      },
      {
        id: '2',
        title: 'some sub task',
        isDone: false,
        projectId: 'proj1',
        parentId: '1',
      },
      {
        id: '3',
        title: 'some parent task that is done',
        isDone: true,
        projectId: 'proj1',
        subTaskIds: ['4'],
      },
      {
        id: '4',
        title: 'some sub task that is done',
        isDone: true,
        projectId: 'proj1',
        parentId: '3',
      },
      {
        id: '5',
        title: 'another',
        isDone: false,
        projectId: 'proj1',
      },
    ];

    const result = replicateMD('', tasks, 'projectToFile');

    expect(result.success).toBe(true);
    // Notes on parent task should be ignored
    expect(result.updatedMarkdown).toBe(`- [ ] some other parent
  - [ ] some sub task
- [x] some parent task that is done
  - [x] some sub task that is done
- [ ] another`);
  });
});
