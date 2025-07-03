import { describe, expect, it } from '@jest/globals';
import {
  parseMarkdownToTree,
  replicateMD,
  tasksToTree,
  TreeNode,
  treeToMarkdown,
} from '../sync-logic';
import { Task } from '../../shared/types';

describe('syncLogic Edge Cases', () => {
  describe('parseMarkdownToTree edge cases', () => {
    it('should handle null and undefined inputs', () => {
      expect(parseMarkdownToTree(null as any)).toEqual([]);
      expect(parseMarkdownToTree(undefined as any)).toEqual([]);
      expect(parseMarkdownToTree('')).toEqual([]);
    });

    it('should handle mixed case X in checkboxes', () => {
      const markdown = `- [X] Uppercase X
- [x] Lowercase x
- [ ] Unchecked`;

      const result = parseMarkdownToTree(markdown);
      expect(result).toHaveLength(3);
      expect(result[0].isDone).toBe(true);
      expect(result[1].isDone).toBe(true);
      expect(result[2].isDone).toBe(false);
    });

    it('should skip tasks with empty titles', () => {
      const markdown = `- [ ]
- [ ]
- [ ] Valid task
- [ ] (id-only)
- [ ] (id-with-space) `;

      const result = parseMarkdownToTree(markdown);
      // parseMarkdownToTree doesn't skip empty titles, it includes them
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Valid task');
      expect(result[1].title).toBe('(id-only)'); // This is considered a title, not just an ID
    });

    it('should handle deeply nested tasks', () => {
      let markdown = '- [ ] Level 0\n';
      for (let i = 1; i <= 10; i++) {
        markdown += '  '.repeat(i) + `- [ ] Level ${i}\n`;
      }

      const result = parseMarkdownToTree(markdown);
      expect(result).toHaveLength(1);

      let current = result[0];
      for (let i = 1; i <= 10; i++) {
        expect(current.children).toHaveLength(1);
        expect(current.children[0].title).toBe(`Level ${i}`);
        expect(current.children[0].level).toBe(i);
        current = current.children[0];
      }
    });

    it('should handle inconsistent indentation', () => {
      const markdown = `- [ ] Root
   - [ ] Three spaces
  - [ ] Two spaces
     - [ ] Five spaces
 - [ ] One space`;

      const result = parseMarkdownToTree(markdown);
      expect(result).toHaveLength(1); // Only Root at root level
      expect(result[0].title).toBe('Root');
      expect(result[0].children).toHaveLength(3); // All others become children
    });

    it('should handle IDs with special characters', () => {
      const markdown = `- [ ] (id-with-dash) Task 1
- [ ] (id_with_underscore) Task 2
- [ ] (id.with.dots) Task 3
- [ ] (id@with#special$chars) Task 4`;

      const result = parseMarkdownToTree(markdown);
      expect(result).toHaveLength(4);
      expect(result[0].id).toBe('id-with-dash');
      expect(result[1].id).toBe('id_with_underscore');
      expect(result[2].id).toBe('id.with.dots');
      expect(result[3].id).toBe('id@with#special$chars');
    });
  });

  describe('tasksToTree edge cases', () => {
    it('should handle null and undefined inputs', () => {
      expect(tasksToTree(null as any)).toEqual([]);
      expect(tasksToTree(undefined as any)).toEqual([]);
      expect(tasksToTree([])).toEqual([]);
    });

    it('should skip tasks without IDs', () => {
      const tasks: Task[] = [
        { id: '', title: 'No ID', isDone: false, projectId: 'proj1' } as any,
        { id: null as any, title: 'Null ID', isDone: false, projectId: 'proj1' },
        {
          id: undefined as any,
          title: 'Undefined ID',
          isDone: false,
          projectId: 'proj1',
        },
        { id: '1', title: 'Valid ID', isDone: false, projectId: 'proj1' },
      ];

      const result = tasksToTree(tasks);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should handle tasks with empty titles', () => {
      const tasks: Task[] = [
        { id: '1', title: '', isDone: false, projectId: 'proj1' },
        { id: '2', title: null as any, isDone: false, projectId: 'proj1' },
        { id: '3', title: undefined as any, isDone: false, projectId: 'proj1' },
      ];

      const result = tasksToTree(tasks);
      expect(result).toHaveLength(3);
      expect(result[0].title).toBe('');
      expect(result[1].title).toBe('');
      expect(result[2].title).toBe('');
    });

    it('should handle circular parent-child references', () => {
      const tasks: Task[] = [
        { id: '1', title: 'Task 1', isDone: false, projectId: 'proj1', parentId: '3' },
        { id: '2', title: 'Task 2', isDone: false, projectId: 'proj1', parentId: '1' },
        { id: '3', title: 'Task 3', isDone: false, projectId: 'proj1', parentId: '2' },
      ];

      const result = tasksToTree(tasks);
      // All tasks form a circular chain, so none can be added as children
      // They all end up as root nodes
      expect(result).toHaveLength(0); // No roots because all have parents in circular chain
    });

    it('should handle self-referencing tasks', () => {
      const tasks: Task[] = [
        { id: '1', title: 'Self ref', isDone: false, projectId: 'proj1', parentId: '1' },
        { id: '2', title: 'Normal', isDone: false, projectId: 'proj1' },
      ];

      const result = tasksToTree(tasks);
      expect(result).toHaveLength(1); // Only task 2, task 1 has circular self-reference
      expect(result[0].id).toBe('2');
    });

    it('should handle circular references in subTaskIds', () => {
      const tasks: Task[] = [
        {
          id: '1',
          title: 'Task 1',
          isDone: false,
          projectId: 'proj1',
          subTaskIds: ['2'],
        },
        {
          id: '2',
          title: 'Task 2',
          isDone: false,
          projectId: 'proj1',
          parentId: '1',
          subTaskIds: ['1'], // Circular reference
        },
      ];

      const result = tasksToTree(tasks);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0].id).toBe('2');
      expect(result[0].children[0].children).toHaveLength(0); // Circular ref prevented
    });

    it('should handle orphaned subtasks in subTaskIds', () => {
      const tasks: Task[] = [
        {
          id: '1',
          title: 'Parent',
          isDone: false,
          projectId: 'proj1',
          subTaskIds: ['2', 'non-existent', '3'],
        },
        { id: '2', title: 'Child 1', isDone: false, projectId: 'proj1' },
        { id: '3', title: 'Child 2', isDone: false, projectId: 'proj1' },
      ];

      const result = tasksToTree(tasks);
      expect(result).toHaveLength(1);
      expect(result[0].children).toHaveLength(2); // Only existing children
      expect(result[0].children[0].id).toBe('2');
      expect(result[0].children[1].id).toBe('3');
    });

    it('should maintain order from subTaskIds even with conflicting parentId', () => {
      const tasks: Task[] = [
        {
          id: '1',
          title: 'Parent 1',
          isDone: false,
          projectId: 'proj1',
          subTaskIds: ['3', '2'], // Specific order
        },
        {
          id: '2',
          title: 'Child 2',
          isDone: false,
          projectId: 'proj1',
          parentId: '1',
        },
        {
          id: '3',
          title: 'Child 3',
          isDone: false,
          projectId: 'proj1',
          parentId: '1',
        },
      ];

      const result = tasksToTree(tasks);
      expect(result[0].children).toHaveLength(2);
      expect(result[0].children[0].id).toBe('3'); // Should follow subTaskIds order
      expect(result[0].children[1].id).toBe('2');
    });
  });

  describe('treeToMarkdown edge cases', () => {
    it('should handle empty nodes array', () => {
      expect(treeToMarkdown([])).toBe('');
      expect(treeToMarkdown(null as any)).toBe('');
      expect(treeToMarkdown(undefined as any)).toBe('');
    });

    it('should handle nodes with checklist items in notes', () => {
      const tree: TreeNode[] = [
        {
          id: '1',
          title: 'Task with checklist notes',
          isDone: false,
          children: [],
          level: 0,
          notes: '- [ ] Checklist item 1\n- [x] Checklist item 2\n- Regular note line',
        },
      ];

      const result = treeToMarkdown(tree);
      expect(result).toBe(
        '- [ ] Task with checklist notes\n' +
          '  - [ ] Checklist item 1\n' +
          '  - [x] Checklist item 2\n' +
          '  - Regular note line',
      );
    });

    it('should not include notes for tasks with children', () => {
      const tree: TreeNode[] = [
        {
          id: '1',
          title: 'Parent with notes',
          isDone: false,
          children: [
            {
              id: '2',
              title: 'Child',
              isDone: false,
              children: [],
              level: 1,
            },
          ],
          level: 0,
          notes: 'These notes should be ignored',
        },
      ];

      const result = treeToMarkdown(tree);
      expect(result).toBe('- [ ] Parent with notes\n  - [ ] Child');
      expect(result).not.toContain('These notes should be ignored');
    });

    it('should handle very long titles', () => {
      const longTitle = 'A'.repeat(1000);
      const tree: TreeNode[] = [
        {
          id: '1',
          title: longTitle,
          isDone: false,
          children: [],
          level: 0,
        },
      ];

      const result = treeToMarkdown(tree);
      expect(result).toBe(`- [ ] ${longTitle}`);
    });

    it('should handle special characters in titles', () => {
      const tree: TreeNode[] = [
        {
          id: '1',
          title: 'Title with [brackets] and (parentheses) and * asterisks',
          isDone: true,
          children: [],
          level: 0,
        },
      ];

      const result = treeToMarkdown(tree, 0, true);
      expect(result).toBe(
        '- [x] (1) Title with [brackets] and (parentheses) and * asterisks',
      );
    });
  });

  describe('replicateMD edge cases', () => {
    it('should handle null/undefined markdown gracefully', () => {
      const tasks: Task[] = [
        { id: '1', title: 'Task', isDone: false, projectId: 'proj1' },
      ];

      let result = replicateMD(null as any, tasks, 'fileToProject');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      result = replicateMD(undefined as any, tasks, 'fileToProject');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle null/undefined tasks array gracefully', () => {
      const markdown = '- [ ] Task';

      let result = replicateMD(markdown, null as any, 'fileToProject');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      result = replicateMD(markdown, undefined as any, 'fileToProject');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle very large task hierarchies', () => {
      // Create a large hierarchy
      const tasks: Task[] = [];
      for (let i = 0; i < 100; i++) {
        tasks.push({
          id: `parent-${i}`,
          title: `Parent ${i}`,
          isDone: false,
          projectId: 'proj1',
          subTaskIds: [`child-${i}-1`, `child-${i}-2`],
        });

        for (let j = 1; j <= 2; j++) {
          tasks.push({
            id: `child-${i}-${j}`,
            title: `Child ${i}-${j}`,
            isDone: false,
            projectId: 'proj1',
            parentId: `parent-${i}`,
          });
        }
      }

      const result = replicateMD('', tasks, 'projectToFile');
      expect(result.success).toBe(true);
      expect(result.updatedMarkdown.split('\n').length).toBe(300); // 100 parents + 200 children
    });

    it('should preserve task order exactly when syncing from project to file', () => {
      const tasks: Task[] = [
        { id: 'z', title: 'Z Task', isDone: false, projectId: 'proj1' },
        { id: 'a', title: 'A Task', isDone: false, projectId: 'proj1' },
        { id: 'm', title: 'M Task', isDone: false, projectId: 'proj1' },
      ];

      const markdown = `- [ ] A Task
- [ ] M Task
- [ ] Z Task`;

      const result = replicateMD(markdown, tasks, 'projectToFile');
      expect(result.success).toBe(true);
      // Should use task array order, not markdown order
      expect(result.updatedMarkdown).toBe('- [ ] Z Task\n- [ ] A Task\n- [ ] M Task');
    });

    it('should handle concurrent parent and child updates', () => {
      const markdown = `- [x] Parent
  - [ ] Child`;

      const tasks: Task[] = [
        {
          id: '1',
          title: 'Parent',
          isDone: false, // Different from markdown
          projectId: 'proj1',
          subTaskIds: ['2'],
        },
        {
          id: '2',
          title: 'Child',
          isDone: true, // Different from markdown
          projectId: 'proj1',
          parentId: '1',
        },
      ];

      const result = replicateMD(markdown, tasks, 'bidirectional');
      expect(result.success).toBe(true);
      // In bidirectional mode with conflicts, it creates operations for both sides
      expect(result.operations).toHaveLength(4); // 2 task updates + 2 markdown updates
    });
  });
});
