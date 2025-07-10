import { parseMarkdownTasks } from '../../markdown-parser';

describe('markdown-parser', () => {
  describe('parseMarkdownTasks', () => {
    it('should parse simple tasks', () => {
      const content = `
- [ ] Task 1
- [x] Task 2 completed
- [ ] <!-- sp:123 --> Task with ID
      `.trim();

      const result = parseMarkdownTasks(content);

      expect(result.errors).toEqual([]);
      expect(result.tasks).toHaveLength(3);
      expect(result.tasks[0]).toEqual({
        line: 0,
        indent: 0,
        completed: false,
        id: null,
        title: 'Task 1',
        originalLine: '- [ ] Task 1',
        parentId: null,
        isSubtask: false,
        originalId: null,
        depth: 0,
      });
      expect(result.tasks[1]).toEqual({
        line: 1,
        indent: 0,
        completed: true,
        id: null,
        title: 'Task 2 completed',
        originalLine: '- [x] Task 2 completed',
        parentId: null,
        isSubtask: false,
        originalId: null,
        depth: 0,
      });
      expect(result.tasks[2]).toEqual({
        line: 2,
        indent: 0,
        completed: false,
        id: '123',
        title: 'Task with ID',
        originalLine: '- [ ] <!-- sp:123 --> Task with ID',
        parentId: null,
        isSubtask: false,
        originalId: '123',
        depth: 0,
      });
    });

    it('should handle nested tasks', () => {
      const content = `
- [ ] <!-- sp:parent1 --> Parent task
  - [ ] Child task 1
  - [x] <!-- sp:child2 --> Child task 2
    - [ ] Sub-child task
- [ ] Another parent
      `.trim();

      const result = parseMarkdownTasks(content);

      expect(result.errors).toEqual([]);
      expect(result.tasks).toHaveLength(4); // Sub-child task is now treated as notes

      // Parent task
      expect(result.tasks[0]).toEqual({
        line: 0,
        indent: 0,
        completed: false,
        id: 'parent1',
        title: 'Parent task',
        originalLine: '- [ ] <!-- sp:parent1 --> Parent task',
        parentId: null,
        isSubtask: false,
        originalId: 'parent1',
        depth: 0,
      });

      // Child task 1
      expect(result.tasks[1]).toEqual({
        line: 1,
        indent: 2,
        completed: false,
        id: null,
        title: 'Child task 1',
        originalLine: '  - [ ] Child task 1',
        parentId: 'parent1',
        isSubtask: true,
        originalId: null,
        depth: 1,
      });

      // Child task 2 (now has notes from the sub-child)
      expect(result.tasks[2]).toEqual({
        line: 2,
        indent: 2,
        completed: true,
        id: 'child2',
        title: 'Child task 2',
        originalLine: '  - [x] <!-- sp:child2 --> Child task 2',
        parentId: 'parent1',
        isSubtask: true,
        originalId: 'child2',
        depth: 1,
        noteLines: ['    - [ ] Sub-child task'],
      });

      // Another parent (sub-child is now notes, so this is index 3)
      expect(result.tasks[3]).toEqual({
        line: 4,
        indent: 0,
        completed: false,
        id: null,
        title: 'Another parent',
        originalLine: '- [ ] Another parent',
        parentId: null,
        isSubtask: false,
        originalId: null,
        depth: 0,
      });
    });

    it('should skip empty task titles', () => {
      const content = `
- [ ]
- [x] Valid task
- [ ] <!-- sp:123 -->
      `.trim();

      const result = parseMarkdownTasks(content);

      expect(result.errors).toEqual([
        'Skipping task with empty title at line 1',
        'Skipping task with empty title at line 3',
      ]);
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].title).toBe('Valid task');
    });

    it('should ignore non-task lines', () => {
      const content = `
# Heading
Some text
- [ ] Task 1
More text
- [x] Task 2
      `.trim();

      const result = parseMarkdownTasks(content);

      expect(result.errors).toEqual([]);
      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[0].title).toBe('Task 1');
      expect(result.tasks[1].title).toBe('Task 2');
    });

    it('should handle various ID formats', () => {
      const content = `
- [ ] <!-- sp:simple-id --> Task 1
- [x] <!-- sp:123-456-789 --> Task 2
- [ ] <!-- sp:uuid-like-id-here --> Task 3
      `.trim();

      const result = parseMarkdownTasks(content);

      expect(result.errors).toEqual([]);
      expect(result.tasks).toHaveLength(3);
      expect(result.tasks[0].id).toBe('simple-id');
      expect(result.tasks[1].id).toBe('123-456-789');
      expect(result.tasks[2].id).toBe('uuid-like-id-here');
    });
  });
});
