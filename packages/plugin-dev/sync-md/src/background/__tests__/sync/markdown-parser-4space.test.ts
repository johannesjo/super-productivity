import { parseMarkdown } from '../../sync/markdown-parser';

describe('parseMarkdown - 4-space indentation without IDs', () => {
  it('should parse 4-space indented subtasks without IDs and maintain parent-child relationships', () => {
    const markdown = `- [ ] then i am adding tasks
    - [ ] yeah and sub tasks nicely
    - [ ] or is it?
    - [ ] what is going on?`;

    const tasks = parseMarkdown(markdown);

    expect(tasks).toHaveLength(4);

    // Parent task
    expect(tasks[0]).toMatchObject({
      title: 'then i am adding tasks',
      completed: false,
      id: null,
      parentId: null,
      isSubtask: false,
      depth: 0,
    });

    // All subtasks should have the same parent (temp_0)
    expect(tasks[1]).toMatchObject({
      title: 'yeah and sub tasks nicely',
      completed: false,
      id: null,
      parentId: 'temp_0', // References the parent using temporary ID
      isSubtask: true,
      depth: 1,
    });

    expect(tasks[2]).toMatchObject({
      title: 'or is it?',
      completed: false,
      id: null,
      parentId: 'temp_0', // References the parent using temporary ID
      isSubtask: true,
      depth: 1,
    });

    expect(tasks[3]).toMatchObject({
      title: 'what is going on?',
      completed: false,
      id: null,
      parentId: 'temp_0', // References the parent using temporary ID
      isSubtask: true,
      depth: 1,
    });
  });

  it('should handle complex hierarchy without IDs using temporary references', () => {
    const markdown = `- [ ] Parent 1
  - [ ] Child 1.1
  - [ ] Child 1.2
- [ ] Parent 2
  - [ ] Child 2.1`;

    const tasks = parseMarkdown(markdown);

    expect(tasks).toHaveLength(5);

    // The parser should use temporary IDs to maintain parent-child relationships
    expect(tasks[1].parentId).toBe('temp_0'); // Child 1.1 -> Parent 1
    expect(tasks[2].parentId).toBe('temp_0'); // Child 1.2 -> Parent 1
    expect(tasks[4].parentId).toBe('temp_3'); // Child 2.1 -> Parent 2
  });
});
