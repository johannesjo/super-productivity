import { convertTasksToMarkdown, formatTask } from '../../sync/sp-to-md';
import { Task } from '@super-productivity/plugin-api';

describe('convertTasksToMarkdown', () => {
  it('should convert simple tasks', () => {
    const tasks: Task[] = [
      { id: 'task1', title: 'Task 1', isDone: false, parentId: null } as Task,
      { id: 'task2', title: 'Task 2', isDone: true, parentId: null } as Task,
    ];

    const markdown = convertTasksToMarkdown(tasks);

    expect(markdown).toContain('- [ ] <!--task1--> Task 1');
    expect(markdown).toContain('- [x] <!--task2--> Task 2');
  });

  it('should convert tasks with parent-child relationships', () => {
    const tasks: Task[] = [
      { id: 'parent1', title: 'Parent Task', isDone: false, parentId: null } as Task,
      { id: 'child1', title: 'Child Task 1', isDone: false, parentId: 'parent1' } as Task,
      { id: 'child2', title: 'Child Task 2', isDone: true, parentId: 'parent1' } as Task,
    ];

    const markdown = convertTasksToMarkdown(tasks);

    expect(markdown).toContain('- [ ] <!--parent1--> Parent Task');
    expect(markdown).toContain('  - [ ] <!--child1--> Child Task 1');
    expect(markdown).toContain('  - [x] <!--child2--> Child Task 2');
  });

  it('should include subtask notes with proper indentation', () => {
    const tasks: Task[] = [
      { id: 'parent1', title: 'Parent Task', isDone: false, parentId: null } as Task,
      {
        id: 'child1',
        title: 'Child Task',
        isDone: false,
        parentId: 'parent1',
        notes: 'Line 1\nLine 2',
      } as Task,
    ];

    const markdown = convertTasksToMarkdown(tasks);

    expect(markdown).toContain('- [ ] <!--parent1--> Parent Task');
    expect(markdown).toContain('  - [ ] <!--child1--> Child Task');
    expect(markdown).toContain('    Line 1');
    expect(markdown).toContain('    Line 2');
  });

  it('should include parent task notes after subtasks', () => {
    const tasks: Task[] = [
      {
        id: 'parent1',
        title: 'Parent Task',
        isDone: false,
        parentId: null,
        notes: 'Parent note 1\nParent note 2',
      } as Task,
      { id: 'child1', title: 'Child Task', isDone: false, parentId: 'parent1' } as Task,
    ];

    const markdown = convertTasksToMarkdown(tasks);

    expect(markdown).toContain('- [ ] <!--parent1--> Parent Task');
    expect(markdown).toContain('  - [ ] <!--child1--> Child Task');
    expect(markdown).toContain('  Parent note 1');
    expect(markdown).toContain('  Parent note 2');
  });

  it('should handle tasks without IDs', () => {
    const tasks: Task[] = [
      { id: undefined, title: 'Task without ID', isDone: false, parentId: null } as Task,
    ];

    const markdown = convertTasksToMarkdown(tasks);

    expect(markdown).toContain('- [ ] Task without ID');
    expect(markdown).not.toContain('<!--');
  });

  it('should handle empty notes properly', () => {
    const tasks: Task[] = [
      {
        id: 'parent1',
        title: 'Parent Task',
        isDone: false,
        parentId: null,
        notes: '',
      } as Task,
      {
        id: 'child1',
        title: 'Child Task',
        isDone: false,
        parentId: 'parent1',
        notes: '  ',
      } as Task,
    ];

    const markdown = convertTasksToMarkdown(tasks);

    expect(markdown).toContain('- [ ] <!--parent1--> Parent Task');
    expect(markdown).toContain('  - [ ] <!--child1--> Child Task');
    // Should not include empty notes
    expect(markdown).not.toContain('    ');
  });

  it('should order subtasks according to subTaskIds', () => {
    const tasks: Task[] = [
      {
        id: 'parent1',
        title: 'Parent Task',
        isDone: false,
        parentId: null,
        subTaskIds: ['child2', 'child1', 'child3'], // Specific order
      } as Task,
      { id: 'child1', title: 'Child Task 1', isDone: false, parentId: 'parent1' } as Task,
      { id: 'child2', title: 'Child Task 2', isDone: false, parentId: 'parent1' } as Task,
      { id: 'child3', title: 'Child Task 3', isDone: false, parentId: 'parent1' } as Task,
    ];

    const markdown = convertTasksToMarkdown(tasks);
    const lines = markdown.split('\n');

    // Find the indices of the subtasks
    const parentIndex = lines.findIndex((line) => line.includes('Parent Task'));
    const child1Index = lines.findIndex((line) => line.includes('Child Task 1'));
    const child2Index = lines.findIndex((line) => line.includes('Child Task 2'));
    const child3Index = lines.findIndex((line) => line.includes('Child Task 3'));

    // Verify the order matches subTaskIds: child2, child1, child3
    expect(parentIndex).toBeLessThan(child2Index);
    expect(child2Index).toBeLessThan(child1Index);
    expect(child1Index).toBeLessThan(child3Index);
  });

  it('should handle missing subtasks in subTaskIds gracefully', () => {
    const tasks: Task[] = [
      {
        id: 'parent1',
        title: 'Parent Task',
        isDone: false,
        parentId: null,
        subTaskIds: ['child1', 'missing-child', 'child2'], // Contains non-existent task
      } as Task,
      { id: 'child1', title: 'Child Task 1', isDone: false, parentId: 'parent1' } as Task,
      { id: 'child2', title: 'Child Task 2', isDone: false, parentId: 'parent1' } as Task,
    ];

    const markdown = convertTasksToMarkdown(tasks);

    // Should include only existing subtasks
    expect(markdown).toContain('- [ ] <!--parent1--> Parent Task');
    expect(markdown).toContain('  - [ ] <!--child1--> Child Task 1');
    expect(markdown).toContain('  - [ ] <!--child2--> Child Task 2');
    expect(markdown).not.toContain('missing-child');
  });

  it('should fallback to unordered subtasks when subTaskIds is not provided', () => {
    const tasks: Task[] = [
      {
        id: 'parent1',
        title: 'Parent Task',
        isDone: false,
        parentId: null,
        // No subTaskIds property
      } as Task,
      { id: 'child1', title: 'Child Task 1', isDone: false, parentId: 'parent1' } as Task,
      { id: 'child2', title: 'Child Task 2', isDone: false, parentId: 'parent1' } as Task,
    ];

    const markdown = convertTasksToMarkdown(tasks);

    // Should include all subtasks
    expect(markdown).toContain('- [ ] <!--parent1--> Parent Task');
    expect(markdown).toContain('  - [ ] <!--child1--> Child Task 1');
    expect(markdown).toContain('  - [ ] <!--child2--> Child Task 2');
  });

  it('should preserve the order of parent tasks as provided in the input array', () => {
    const tasks: Task[] = [
      { id: 'task3', title: 'Third Task', isDone: false, parentId: null } as Task,
      { id: 'task1', title: 'First Task', isDone: false, parentId: null } as Task,
      { id: 'task2', title: 'Second Task', isDone: true, parentId: null } as Task,
    ];

    const markdown = convertTasksToMarkdown(tasks);
    const lines = markdown.split('\n').filter((line) => line.trim());

    // Verify tasks appear in the same order as the input array
    expect(lines[0]).toContain('Third Task');
    expect(lines[1]).toContain('First Task');
    expect(lines[2]).toContain('Second Task');
  });
});

describe('formatTask', () => {
  it('should format task with ID', () => {
    const task: Task = {
      id: 'task1',
      title: 'Test Task',
      isDone: false,
      parentId: null,
    } as Task;
    const result = formatTask(task);
    expect(result).toBe('- [ ] <!--task1--> Test Task');
  });

  it('should format task without ID', () => {
    const task: Task = {
      id: undefined,
      title: 'Test Task',
      isDone: false,
      parentId: null,
    } as Task;
    const result = formatTask(task);
    expect(result).toBe('- [ ] Test Task');
  });

  it('should format completed task', () => {
    const task: Task = {
      id: 'task1',
      title: 'Test Task',
      isDone: true,
      parentId: null,
    } as Task;
    const result = formatTask(task);
    expect(result).toBe('- [x] <!--task1--> Test Task');
  });

  it('should format task with indentation', () => {
    const task: Task = {
      id: 'task1',
      title: 'Test Task',
      isDone: false,
      parentId: null,
    } as Task;
    const result = formatTask(task, 2);
    expect(result).toBe('  - [ ] <!--task1--> Test Task');
  });
});
