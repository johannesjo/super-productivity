import { describe, expect, it } from '@jest/globals';
import { parseMarkdownTasks } from '../parseMarkdownTasks';
import { replicateTasks } from '../replicateTasks';
import { applySPUpdates } from '../applySPUpdates';
import { createMarkdownLine } from '../createMarkdownLine';
import { generateTaskId } from '../generateTaskId';
import type { MarkdownTask, SPUpdate, SuperProductivityTask } from '../types';

describe('Replication Error Handling', () => {
  describe('parseMarkdownTasks error cases', () => {
    it('should handle null input gracefully', () => {
      const result = parseMarkdownTasks(null as any);
      expect(result).toEqual([]);
    });

    it('should handle undefined input gracefully', () => {
      const result = parseMarkdownTasks(undefined as any);
      expect(result).toEqual([]);
    });

    it('should handle malformed markdown with missing brackets', () => {
      const markdown = `- [ Task without closing bracket
- x] Task without opening bracket
- [] Empty checkbox
- [?] Invalid checkbox state`;

      const result = parseMarkdownTasks(markdown);
      expect(result).toHaveLength(1); // Only the empty checkbox should parse
      expect(result[0].isDone).toBe(false);
      expect(result[0].title).toBe('Empty checkbox');
    });

    it('should handle very long titles gracefully', () => {
      const longTitle = 'A'.repeat(10000);
      const markdown = `- [ ] ${longTitle}`;

      const result = parseMarkdownTasks(markdown);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe(longTitle);
    });

    it('should handle special characters in titles', () => {
      const specialChars = '!@#$%^&*()_+-={}[]|\\:";\'<>?,./`~';
      const markdown = `- [ ] Task with ${specialChars} special chars`;

      const result = parseMarkdownTasks(markdown);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe(`Task with ${specialChars} special chars`);
    });

    it('should handle unicode characters', () => {
      const markdown = `- [ ] 任务 with 中文 and 🚀 emoji
- [x] مهمة عربية
- [ ] Tâche française`;

      const result = parseMarkdownTasks(markdown);
      expect(result).toHaveLength(3);
      expect(result[0].title).toBe('任务 with 中文 and 🚀 emoji');
      expect(result[1].title).toBe('مهمة عربية');
      expect(result[2].title).toBe('Tâche française');
    });
  });

  describe('replicateTasks error cases', () => {
    it('should handle empty inputs', () => {
      const result = replicateTasks('', [], [], 'proj1');
      expect(result.stats).toEqual({ created: 0, updated: 0, deleted: 0 });
      expect(result.superProductivityUpdates).toEqual([]);
    });

    it('should handle duplicate IDs in markdown tasks', () => {
      const markdownTasks: MarkdownTask[] = [
        {
          line: '- [ ] Task 1',
          lineNumber: 0,
          id: 'dup-id',
          title: 'Task 1',
          isDone: false,
        },
        {
          line: '- [ ] Task 2',
          lineNumber: 1,
          id: 'dup-id',
          title: 'Task 2',
          isDone: false,
        },
      ];

      const result = replicateTasks('', markdownTasks, [], 'proj1');
      // Should handle duplicates gracefully - last one wins
      expect(result.stats.created).toBe(1);
      expect(result.superProductivityUpdates[0].task?.title).toBe('Task 2');
    });

    it('should handle missing required fields in SP tasks', () => {
      const spTasks: SuperProductivityTask[] = [
        { id: '', title: 'No ID', isDone: false, projectId: 'proj1' } as any,
        { id: 'task1', title: '', isDone: false, projectId: 'proj1' },
      ];

      const markdownTasks: MarkdownTask[] = [
        { line: '- [ ] Task', lineNumber: 0, title: 'Task', isDone: false },
      ];

      // Should not crash with invalid SP tasks
      const result = replicateTasks('', markdownTasks, spTasks, 'proj1');
      expect(result.stats.created).toBe(1); // Creates new task for markdown
    });

    it('should handle very large task lists', () => {
      const largeMdTasks: MarkdownTask[] = [];
      const largeSpTasks: SuperProductivityTask[] = [];

      // Create 1000 tasks
      for (let i = 0; i < 1000; i++) {
        largeMdTasks.push({
          line: `- [ ] Task ${i}`,
          lineNumber: i,
          id: `task-${i}`,
          title: `Task ${i}`,
          isDone: false,
        });

        largeSpTasks.push({
          id: `task-${i}`,
          title: `Task ${i}`,
          isDone: false,
          projectId: 'proj1',
        });
      }

      const result = replicateTasks('', largeMdTasks, largeSpTasks, 'proj1');
      expect(result.stats).toEqual({ created: 0, updated: 0, deleted: 0 });
    });
  });

  describe('applySPUpdates error cases', () => {
    it('should handle null updates array', () => {
      const result = applySPUpdates(null as any);
      expect(result).toEqual({ creates: [], updates: [], deletes: [] });
    });

    it('should handle undefined updates array', () => {
      const result = applySPUpdates(undefined as any);
      expect(result).toEqual({ creates: [], updates: [], deletes: [] });
    });

    it('should skip invalid update entries', () => {
      const updates: SPUpdate[] = [
        { type: 'create' }, // Missing task
        { type: 'update' }, // Missing id and task
        { type: 'delete' }, // Missing id
        { type: 'invalid' as any }, // Invalid type
        null as any, // Null entry
        undefined as any, // Undefined entry
      ];

      const result = applySPUpdates(updates);
      expect(result.creates).toHaveLength(0);
      expect(result.updates).toHaveLength(0);
      expect(result.deletes).toHaveLength(0);
    });

    it('should handle updates with partial data', () => {
      const updates: SPUpdate[] = [
        { type: 'create', task: { title: 'Only title' } as any },
        { type: 'update', id: 'task1', task: {} },
        { type: 'delete', id: 'task2' },
      ];

      const result = applySPUpdates(updates);
      expect(result.creates).toHaveLength(1);
      expect(result.updates).toHaveLength(1);
      expect(result.deletes).toHaveLength(1);
    });
  });

  describe('createMarkdownLine error cases', () => {
    it('should handle null task', () => {
      const result = createMarkdownLine(null as any, 'id1');
      expect(result).toBe('- [ ] <!-- sp:id1 --> ');
    });

    it('should handle undefined task', () => {
      const result = createMarkdownLine(undefined as any, 'id1');
      expect(result).toBe('- [ ] <!-- sp:id1 --> ');
    });

    it('should handle task with missing fields', () => {
      const task: Partial<MarkdownTask> = { title: 'Title only' };
      const result = createMarkdownLine(task as any, 'id1');
      expect(result).toBe('- [ ] <!-- sp:id1 --> Title only');
    });

    it('should handle very long IDs', () => {
      const longId = 'x'.repeat(1000);
      const task: MarkdownTask = {
        line: '- [ ] Task',
        lineNumber: 0,
        title: 'Task',
        isDone: false,
      };

      const result = createMarkdownLine(task, longId);
      expect(result).toBe(`- [ ] <!-- sp:${longId} --> Task`);
    });

    it('should escape special characters in title', () => {
      const task: MarkdownTask = {
        line: '- [ ] Task',
        lineNumber: 0,
        title: 'Task with (parentheses) and [brackets]',
        isDone: false,
      };

      const result = createMarkdownLine(task, 'id1');
      expect(result).toBe('- [ ] <!-- sp:id1 --> Task with (parentheses) and [brackets]');
    });
  });

  describe('generateTaskId error cases', () => {
    it('should generate unique IDs even when called rapidly', () => {
      const ids = new Set<string>();

      for (let i = 0; i < 1000; i++) {
        ids.add(generateTaskId());
      }

      expect(ids.size).toBe(1000); // All IDs should be unique
    });

    it('should generate valid IDs', () => {
      const id = generateTaskId();
      expect(id).toMatch(/^[a-zA-Z0-9_-]+$/); // Valid characters only
      expect(id.length).toBeGreaterThan(0);
      expect(id.length).toBeLessThan(50); // Reasonable length
    });
  });

  describe('Integration error scenarios', () => {
    it('should handle circular references in task hierarchy', () => {
      const spTasks: SuperProductivityTask[] = [
        {
          id: 'task1',
          title: 'Task 1',
          isDone: false,
          projectId: 'proj1',
          parentId: 'task2', // Circular reference
        },
        {
          id: 'task2',
          title: 'Task 2',
          isDone: false,
          projectId: 'proj1',
          parentId: 'task1', // Circular reference
        },
      ];

      const markdownTasks: MarkdownTask[] = [
        {
          line: '- [ ] Task 1',
          lineNumber: 0,
          id: 'task1',
          title: 'Task 1',
          isDone: false,
        },
        {
          line: '- [ ] Task 2',
          lineNumber: 1,
          id: 'task2',
          title: 'Task 2',
          isDone: false,
        },
      ];

      // Should not crash or go into infinite loop
      const result = replicateTasks('', markdownTasks, spTasks, 'proj1');
      expect(result.stats.updated).toBe(0); // No updates needed
    });

    it('should handle concurrent modifications gracefully', () => {
      const markdown = '- [ ] Task 1\n- [ ] Task 2';
      const markdownTasks = parseMarkdownTasks(markdown);

      // Simulate concurrent modification by changing the markdown during processing
      const modifiedMarkdown = '- [ ] Task 1\n- [x] Task 2\n- [ ] Task 3';

      const result = replicateTasks(modifiedMarkdown, markdownTasks, [], 'proj1');

      // Should complete without errors
      expect(result.markdownContent).toBeDefined();
      expect(result.stats.created).toBe(2); // Original 2 tasks
    });
  });
});
