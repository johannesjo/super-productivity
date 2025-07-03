import { parseMarkdownTasks } from './parseMarkdownTasks';

describe('parseMarkdownTasks', () => {
  it('should parse simple tasks without IDs', () => {
    const content = `
- [ ] Task 1
- [x] Task 2
- [ ] Task 3
`;
    const tasks = parseMarkdownTasks(content);

    expect(tasks).toHaveLength(3);
    expect(tasks[0]).toEqual({
      line: '- [ ] Task 1',
      lineNumber: 1,
      id: undefined,
      title: 'Task 1',
      isDone: false,
    });
    expect(tasks[1]).toEqual({
      line: '- [x] Task 2',
      lineNumber: 2,
      id: undefined,
      title: 'Task 2',
      isDone: true,
    });
  });

  it('should parse tasks with HTML comment IDs', () => {
    const content = `
- [ ] <!-- sp:task-001 --> Task with ID
- [x] <!-- sp:task-002 --> Completed task
`;
    const tasks = parseMarkdownTasks(content);

    expect(tasks).toHaveLength(2);
    expect(tasks[0]).toEqual({
      line: '- [ ] <!-- sp:task-001 --> Task with ID',
      lineNumber: 1,
      id: 'task-001',
      title: 'Task with ID',
      isDone: false,
    });
    expect(tasks[1]).toEqual({
      line: '- [x] <!-- sp:task-002 --> Completed task',
      lineNumber: 2,
      id: 'task-002',
      title: 'Completed task',
      isDone: true,
    });
  });

  it('should handle indented tasks', () => {
    const content = `
- [ ] Parent task
  - [ ] <!-- sp:child-001 --> Indented child
    - [x] Deeply nested task
`;
    const tasks = parseMarkdownTasks(content);

    expect(tasks).toHaveLength(3);
    expect(tasks[1].line).toBe('  - [ ] <!-- sp:child-001 --> Indented child');
    expect(tasks[1].id).toBe('child-001');
    expect(tasks[2].line).toBe('    - [x] Deeply nested task');
    expect(tasks[2].isDone).toBe(true);
  });

  it('should ignore non-task lines', () => {
    const content = `
# Heading
Some text
- [ ] Real task
- Not a task
* [ ] Also not a task
- [Y] Invalid checkbox
`;
    const tasks = parseMarkdownTasks(content);

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe('Real task');
  });

  it('should handle empty titles', () => {
    const content = `
- [ ]
- [ ] <!-- sp:empty -->
`;
    const tasks = parseMarkdownTasks(content);

    expect(tasks).toHaveLength(2);
    expect(tasks[0].title).toBe('');
    expect(tasks[1].title).toBe('');
    expect(tasks[1].id).toBe('empty');
  });

  it('should handle various spacing', () => {
    const content = `
- [ ]No space after checkbox
- [ ]  <!-- sp:id -->  Extra spaces
- [x]<!-- sp:id2 -->No spaces around comment
`;
    const tasks = parseMarkdownTasks(content);

    expect(tasks).toHaveLength(3);
    expect(tasks[0].title).toBe('No space after checkbox');
    expect(tasks[1].title).toBe('Extra spaces');
    expect(tasks[2].title).toBe('No spaces around comment');
  });
});
