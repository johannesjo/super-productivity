import { parseMarkdownToTree, treeToMarkdown, tasksToTree } from '../sync-logic';
import { Task } from '../../shared/types';

describe('Notes Handling', () => {
  describe('Markdown to Task parsing', () => {
    it('should parse nested checklist items as notes for leaf tasks', () => {
      const markdown = `
- [ ] some parent task
  - [ ] some sub task
  - [ ] some other sub task
    - [ ] some checklist task in notes
    - [ ] some other checklist task in notes
      `.trim();

      const tree = parseMarkdownToTree(markdown);

      expect(tree).toHaveLength(1);
      expect(tree[0].title).toBe('some parent task');
      expect(tree[0].children).toHaveLength(2);

      const secondSubTask = tree[0].children[1];
      expect(secondSubTask.title).toBe('some other sub task');
      expect(secondSubTask.children).toHaveLength(2);

      // The nested checklist items should be parsed as child tasks
      expect(secondSubTask.children[0].title).toBe('some checklist task in notes');
      expect(secondSubTask.children[1].title).toBe('some other checklist task in notes');
    });

    it('should handle mixed completed and uncompleted checklist items', () => {
      const markdown = `
- [ ] parent task
  - [x] completed sub task
    - [ ] uncompleted checklist item
    - [x] completed checklist item
      `.trim();

      const tree = parseMarkdownToTree(markdown);

      const subTask = tree[0].children[0];
      expect(subTask.isDone).toBe(true);
      expect(subTask.children).toHaveLength(2);
      expect(subTask.children[0].isDone).toBe(false);
      expect(subTask.children[1].isDone).toBe(true);
    });
  });

  describe('Task to Markdown conversion', () => {
    it('should include notes as nested checklist items for leaf tasks', () => {
      const tasks: Task[] = [
        {
          id: '1',
          title: 'some other parent',
          isDone: false,
          notes:
            '- [ ] some checklist task in notes\n- [ ] some other checklist task in notes',
          subTaskIds: ['2'],
        },
        {
          id: '2',
          title: 'some sub task',
          isDone: false,
          parentId: '1',
          notes: '',
        },
      ];

      const tree = tasksToTree(tasks);
      const markdown = treeToMarkdown(tree);

      expect(markdown).toBe('- [ ] some other parent\n' + '  - [ ] some sub task');
      // Parent task notes should be ignored when it has children
    });

    it('should include notes for leaf tasks only', () => {
      const tasks: Task[] = [
        {
          id: '1',
          title: 'parent with notes',
          isDone: false,
          notes: 'These notes should be ignored',
          subTaskIds: ['2'],
        },
        {
          id: '2',
          title: 'leaf task with notes',
          isDone: false,
          parentId: '1',
          notes: '- [ ] checklist item 1\n- [x] checklist item 2',
        },
      ];

      const tree = tasksToTree(tasks);
      const markdown = treeToMarkdown(tree);

      expect(markdown).toBe(
        '- [ ] parent with notes\n' +
          '  - [ ] leaf task with notes\n' +
          '    - [ ] checklist item 1\n' +
          '    - [x] checklist item 2',
      );

      expect(markdown).not.toContain('These notes should be ignored');
    });

    it('should handle both checklist and regular notes in leaf tasks', () => {
      const tasks: Task[] = [
        {
          id: '1',
          title: 'task with mixed notes',
          isDone: false,
          notes: '- [ ] checklist item\nRegular note line\n- [x] another checklist',
        },
      ];

      const tree = tasksToTree(tasks);
      const markdown = treeToMarkdown(tree);

      expect(markdown).toBe(
        '- [ ] task with mixed notes\n' +
          '  - [ ] checklist item\n' +
          '  - Regular note line\n' +
          '  - [x] another checklist',
      );
    });

    it('should format parent task with subtasks correctly', () => {
      const tasks: Task[] = [
        {
          id: '1',
          title: 'some parent task that is done',
          isDone: true,
          subTaskIds: ['2'],
        },
        {
          id: '2',
          title: 'some sub task that is done',
          isDone: true,
          parentId: '1',
        },
        {
          id: '3',
          title: 'another',
          isDone: false,
        },
      ];

      const tree = tasksToTree(tasks);
      const markdown = treeToMarkdown(tree);

      expect(markdown).toBe(
        '- [x] some parent task that is done\n' +
          '  - [x] some sub task that is done\n' +
          '- [ ] another',
      );
    });
  });

  describe('Notes field behavior', () => {
    it('should not store markdown IDs in task notes field', () => {
      const tasks: Task[] = [
        {
          id: 'task-1',
          title: 'Task without ID in notes',
          isDone: false,
          notes: 'Just regular notes content',
        },
      ];

      const tree = tasksToTree(tasks);

      // Ensure notes don't contain any ID patterns
      expect(tree[0].notes).toBe('Just regular notes content');
      expect(tree[0].notes).not.toContain('<!-- sp:');
      expect(tree[0].notes).not.toContain('md-');
    });

    it('should preserve existing notes content without modification', () => {
      const originalNotes =
        'My important notes\nWith multiple lines\n- [ ] And a checklist';
      const tasks: Task[] = [
        {
          id: 'task-1',
          title: 'Task with notes',
          isDone: false,
          notes: originalNotes,
        },
      ];

      const tree = tasksToTree(tasks);

      expect(tree[0].notes).toBe(originalNotes);
    });
  });
});
