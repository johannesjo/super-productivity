import { describe, expect, it } from '@jest/globals';
import {
  parseMarkdownToTree,
  replicateMD,
  tasksToTree,
} from '../../background/sync-logic';
import { replicateTasks } from '../../background/replication';
import type { Task } from '../../shared/types';
import type {
  MarkdownTask,
  SuperProductivityTask,
} from '../../background/replication/types';

describe('Performance Tests', () => {
  describe('Large dataset handling', () => {
    it('should handle 1000 tasks efficiently in parseMarkdownToTree', () => {
      // Generate large markdown
      let markdown = '';
      for (let i = 0; i < 1000; i++) {
        markdown += `- [ ] Task ${i}\n`;
        if (i % 10 === 0) {
          // Add some subtasks
          markdown += `  - [ ] Subtask ${i}-1\n`;
          markdown += `  - [ ] Subtask ${i}-2\n`;
        }
      }

      const startTime = Date.now();
      const result = parseMarkdownToTree(markdown);
      const endTime = Date.now();

      expect(result.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
    });

    it('should handle deeply nested hierarchies (10 levels)', () => {
      // Generate deeply nested markdown
      let markdown = '- [ ] Root\n';
      for (let level = 1; level <= 10; level++) {
        markdown += '  '.repeat(level) + `- [ ] Level ${level}\n`;
      }

      const startTime = Date.now();
      const result = parseMarkdownToTree(markdown);
      const endTime = Date.now();

      expect(result).toHaveLength(1);
      expect(endTime - startTime).toBeLessThan(50); // Should be very fast

      // Verify depth
      let current = result[0];
      for (let level = 1; level <= 10; level++) {
        expect(current.children).toHaveLength(1);
        current = current.children[0];
      }
    });

    it('should handle 5000 tasks in tasksToTree without performance degradation', () => {
      const tasks: Task[] = [];

      // Create a complex hierarchy
      for (let i = 0; i < 1000; i++) {
        const parentId = `parent-${i}`;
        tasks.push({
          id: parentId,
          title: `Parent ${i}`,
          isDone: false,
          projectId: 'proj1',
          subTaskIds: [
            `${parentId}-1`,
            `${parentId}-2`,
            `${parentId}-3`,
            `${parentId}-4`,
          ],
        });

        // Add 4 children per parent
        for (let j = 1; j <= 4; j++) {
          tasks.push({
            id: `${parentId}-${j}`,
            title: `Child ${i}-${j}`,
            isDone: false,
            projectId: 'proj1',
            parentId: parentId,
          });
        }
      }

      const startTime = Date.now();
      const result = tasksToTree(tasks);
      const endTime = Date.now();

      expect(result).toHaveLength(1000); // 1000 root tasks
      expect(endTime - startTime).toBeLessThan(300); // Should complete in under 300ms
    });

    it('should handle large replication operations efficiently', () => {
      // Create large markdown content
      let markdown = '';
      const markdownTasks: MarkdownTask[] = [];
      for (let i = 0; i < 1000; i++) {
        const line = `- [ ] Task ${i}`;
        markdown += line + '\n';
        markdownTasks.push({
          line,
          lineNumber: i,
          title: `Task ${i}`,
          isDone: false,
        });
      }

      // Create large SP tasks array
      const spTasks: SuperProductivityTask[] = [];
      for (let i = 0; i < 1000; i++) {
        spTasks.push({
          id: `sp-${i}`,
          title: `SP Task ${i}`,
          isDone: false,
          projectId: 'proj1',
        });
      }

      const startTime = Date.now();
      const result = replicateTasks(markdown, markdownTasks, spTasks, 'proj1');
      const endTime = Date.now();

      expect(result.superProductivityUpdates).toBeDefined();
      expect(endTime - startTime).toBeLessThan(100); // Should complete quickly
    });
  });

  describe('Memory efficiency', () => {
    it('should not create excessive objects during parsing', () => {
      // Generate markdown with 100 tasks
      let markdown = '';
      for (let i = 0; i < 100; i++) {
        markdown += `- [ ] Task ${i} with a very long title that contains lots of text to test memory usage\n`;
      }

      // Get initial memory (if available)
      const initialMemory = (global as any).process?.memoryUsage?.()?.heapUsed || 0;

      // Parse multiple times to check for memory leaks
      for (let i = 0; i < 10; i++) {
        const result = parseMarkdownToTree(markdown);
        expect(result).toHaveLength(100);
      }

      const finalMemory = (global as any).process?.memoryUsage?.()?.heapUsed || 0;

      // Memory increase should be reasonable (less than 10MB for this test)
      const memoryIncrease = finalMemory - initialMemory;
      if (initialMemory > 0) {
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
      }
    });
  });

  describe('Edge case performance', () => {
    it('should handle extremely long task titles efficiently', () => {
      const longTitle = 'A'.repeat(10000); // 10,000 character title
      const markdown = `- [ ] ${longTitle}\n- [x] ${longTitle}`;

      const startTime = Date.now();
      const result = parseMarkdownToTree(markdown);
      const endTime = Date.now();

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe(longTitle);
      expect(endTime - startTime).toBeLessThan(50); // Should still be fast
    });

    it('should handle many unicode characters efficiently', () => {
      let markdown = '';
      const unicodeChars = ['🚀', '中文', 'العربية', 'हिन्दी', '日本語', '한국어', 'ไทย'];

      for (let i = 0; i < 500; i++) {
        const char = unicodeChars[i % unicodeChars.length];
        markdown += `- [ ] Task with ${char} character ${i}\n`;
      }

      const startTime = Date.now();
      const result = parseMarkdownToTree(markdown);
      const endTime = Date.now();

      expect(result).toHaveLength(500);
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle rapid sync operations with debouncing', () => {
      const tasks: Task[] = [];
      for (let i = 0; i < 100; i++) {
        tasks.push({
          id: `task-${i}`,
          title: `Task ${i}`,
          isDone: false,
          projectId: 'proj1',
        });
      }

      const markdown = '- [ ] Test';

      // Simulate rapid sync calls
      const results: any[] = [];
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        const result = replicateMD(markdown, tasks, 'fileToProject');
        results.push(result);
      }

      const endTime = Date.now();

      expect(results).toHaveLength(100);
      expect(results.every((r) => r.success)).toBe(true);
      expect(endTime - startTime).toBeLessThan(500); // Should complete all 100 operations quickly
    });
  });

  describe('Stress tests', () => {
    it('should handle mixed operations on large datasets', () => {
      // Create a complex scenario with creates, updates, and deletes
      const markdownTasks: MarkdownTask[] = [];
      const spTasks: SuperProductivityTask[] = [];

      // Add tasks that exist in both (will be checked for updates)
      for (let i = 0; i < 300; i++) {
        markdownTasks.push({
          line: `- [${i % 2 === 0 ? 'x' : ' '}] Task ${i}`,
          lineNumber: i,
          id: `common-${i}`,
          title: `Task ${i}`,
          isDone: i % 2 === 0,
        });

        spTasks.push({
          id: `common-${i}`,
          title: `Task ${i} modified`, // Different title
          isDone: i % 2 === 1, // Opposite done state
          projectId: 'proj1',
        });
      }

      // Add tasks only in markdown (will be created)
      for (let i = 300; i < 400; i++) {
        markdownTasks.push({
          line: `- [ ] New Task ${i}`,
          lineNumber: i,
          title: `New Task ${i}`,
          isDone: false,
        });
      }

      // Add tasks only in SP (will be deleted)
      for (let i = 400; i < 500; i++) {
        spTasks.push({
          id: `delete-${i}`,
          title: `Delete Task ${i}`,
          isDone: false,
          projectId: 'proj1',
        });
      }

      const markdown = markdownTasks.map((t) => t.line).join('\n');

      const startTime = Date.now();
      const result = replicateTasks(markdown, markdownTasks, spTasks, 'proj1');
      const endTime = Date.now();

      expect(result.stats.created).toBe(100); // 100 new tasks
      expect(result.stats.updated).toBe(300); // 300 tasks with changes
      expect(result.stats.deleted).toBe(100); // 100 tasks to delete
      expect(endTime - startTime).toBeLessThan(200); // Should handle all operations efficiently
    });

    it('should maintain performance with circular reference detection', () => {
      const tasks: Task[] = [];

      // Create a complex web of potential circular references
      for (let i = 0; i < 100; i++) {
        tasks.push({
          id: `task-${i}`,
          title: `Task ${i}`,
          isDone: false,
          projectId: 'proj1',
          parentId: `task-${(i + 1) % 100}`, // Creates circular chain
          subTaskIds: [`task-${(i + 2) % 100}`, `task-${(i + 3) % 100}`],
        });
      }

      const startTime = Date.now();
      const result = tasksToTree(tasks);
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(500); // Should handle circular refs without hanging
    });
  });
});
