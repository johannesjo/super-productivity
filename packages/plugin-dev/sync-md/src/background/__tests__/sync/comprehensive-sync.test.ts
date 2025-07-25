import {
  createMockPluginAPI,
  createTaskHierarchy,
  generateLargeMarkdown,
  MarkdownBuilder,
  measureExecutionTime,
  ParsedTaskBuilder,
  TaskBuilder,
} from '../test-utils';
import { parseMarkdown, parseMarkdownWithHeader } from '../../sync/markdown-parser';
import { generateTaskOperations } from '../../sync/generate-task-operations';
import { convertTasksToMarkdown } from '../../sync/sp-to-md';
import { mdToSp } from '../../sync/md-to-sp';

// Mock dependencies
jest.mock('../../sync/generate-task-operations');
jest.mock('../../helper/file-utils');

describe('Comprehensive Sync Tests', () => {
  let mockPluginAPI: ReturnType<typeof createMockPluginAPI>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPluginAPI = createMockPluginAPI();
  });

  describe('Using Test Builders', () => {
    it('should create tasks with TaskBuilder', () => {
      const task = new TaskBuilder()
        .withId('custom-id')
        .withTitle('Custom Task')
        .withDone(true)
        .withNotes('Task notes')
        .withSubTaskIds(['sub1', 'sub2'])
        .build();

      expect(task.id).toBe('custom-id');
      expect(task.title).toBe('Custom Task');
      expect(task.isDone).toBe(true);
      expect(task.notes).toBe('Task notes');
      expect(task.subTaskIds).toEqual(['sub1', 'sub2']);
    });

    it('should create parsed tasks with ParsedTaskBuilder', () => {
      const parsedTask = new ParsedTaskBuilder()
        .withId('task-id')
        .withTitle('Parsed Task')
        .withCompleted(true)
        .withIndent(2)
        .withDepth(1)
        .withIsSubtask(true)
        .withParentId('parent-id')
        .build();

      expect(parsedTask.id).toBe('task-id');
      expect(parsedTask.title).toBe('Parsed Task');
      expect(parsedTask.completed).toBe(true);
      expect(parsedTask.isSubtask).toBe(true);
      expect(parsedTask.parentId).toBe('parent-id');
    });

    it('should create markdown with MarkdownBuilder', () => {
      const markdown = new MarkdownBuilder()
        .addTask('First Task', { id: 'task1' })
        .addTask('Subtask', { id: 'sub1', indent: 2 })
        .addNote('This is a note', 4)
        .addEmptyLine()
        .addTask('Second Task', { id: 'task2', completed: true })
        .build();

      expect(markdown).toContain('- [ ] <!--task1--> First Task');
      expect(markdown).toContain('  - [ ] <!--sub1--> Subtask');
      expect(markdown).toContain('    This is a note');
      expect(markdown).toContain('- [x] <!--task2--> Second Task');
    });
  });

  describe('Complex Sync Scenarios', () => {
    it('should handle task hierarchy creation and updates', () => {
      const tasks = createTaskHierarchy({
        parentCount: 3,
        childrenPerParent: 4,
      });

      expect(tasks).toHaveLength(15); // 3 parents + 12 children

      // Verify parent-child relationships
      const parents = tasks.filter((t) => !t.parentId);
      expect(parents).toHaveLength(3);

      parents.forEach((parent) => {
        expect(parent.subTaskIds).toHaveLength(4);

        // Verify children reference parent
        parent.subTaskIds.forEach((childId) => {
          const child = tasks.find((t) => t.id === childId);
          expect(child?.parentId).toBe(parent.id);
        });
      });
    });

    it('should sync complex markdown structure to SP', async () => {
      const markdown = new MarkdownBuilder()
        .addTask('Project Overview', { id: 'overview' })
        .addNote('This project contains multiple features')
        .addEmptyLine()
        .addTask('Feature 1', { id: 'feature1' })
        .addTask('Implement API', { id: 'api', indent: 2 })
        .addTask('Write tests', { id: 'tests', indent: 2, completed: true })
        .addNote('Unit and integration tests', 4)
        .addEmptyLine()
        .addTask('Feature 2', { id: 'feature2' })
        .addTask('Design UI', { id: 'ui', indent: 2 })
        .addTask('Add animations', { id: 'animations', indent: 4 })
        .build();

      // Mock operations instead of parser since we're testing integration
      (generateTaskOperations as jest.Mock).mockReturnValue([
        {
          type: 'create',
          data: { title: 'Project Overview', projectId: 'test-project' },
        },
        // ... more operations
      ]);

      await mdToSp(markdown, 'test-project');

      expect(generateTaskOperations).toHaveBeenCalled();
      expect(mockPluginAPI.batchUpdateForProject).toHaveBeenCalled();
    });
  });

  describe('Performance Tests with Utilities', () => {
    it('should handle large markdown efficiently', async () => {
      const largeMarkdown = generateLargeMarkdown(1000);

      // Test actual parsing performance without mocking
      const time = await measureExecutionTime(() => {
        const result = parseMarkdown(largeMarkdown);
        // The parser only returns tasks at depth 0 and 1 (parents and subtasks)
        // Tasks with indent >= 4 (depth >= 2) are converted to notes
        expect(result.length).toBeGreaterThan(200); // Should have many tasks
      });

      expect(time).toBeLessThan(100); // Should parse in under 100ms
    });

    it('should complete full sync cycle efficiently', async () => {
      const tasks = createTaskHierarchy({
        parentCount: 50,
        childrenPerParent: 5,
      });

      // Convert to markdown
      const markdownTime = await measureExecutionTime(() => {
        convertTasksToMarkdown(tasks);
      });

      expect(markdownTime).toBeLessThan(50);

      // Generate operations (simulated)
      (generateTaskOperations as jest.Mock).mockReturnValue(
        tasks.map((t) => ({
          type: 'update',
          taskId: t.id,
          updates: { title: t.title + ' Updated' },
        })),
      );

      const opsTime = await measureExecutionTime(() => {
        generateTaskOperations([], tasks, 'test-project');
      });

      expect(opsTime).toBeLessThan(50);
    });
  });

  describe('Edge Cases with Builders', () => {
    it('should handle markdown with mixed content types', () => {
      const markdown = new MarkdownBuilder()
        .addText('# Project Title')
        .addEmptyLine()
        .addText('Some description text')
        .addEmptyLine()
        .addTask('First task', { id: 'task1' })
        .addText('Random text between tasks')
        .addTask('Second task', { id: 'task2' })
        .addEmptyLine()
        .addText('## Section')
        .addTask('Section task', { id: 'task3' })
        .build();

      expect(markdown).toContain('# Project Title');
      expect(markdown).toContain('- [ ] <!--task1--> First task');
      expect(markdown).toContain('Random text between tasks');
      expect(markdown).toContain('## Section');
    });

    it('should handle deeply nested structures', () => {
      const builder = new MarkdownBuilder();

      // Create deep nesting
      for (let i = 0; i < 10; i++) {
        builder.addTask(`Level ${i} task`, {
          id: `level${i}`,
          indent: i * 2,
        });
      }

      const markdown = builder.build();

      expect(markdown).toContain('- [ ] <!--level0--> Level 0 task');
      expect(markdown).toContain(' '.repeat(18) + '- [ ] <!--level9--> Level 9 task');
    });

    it('should create tasks with all special characters', () => {
      const specialChars = '!@#$%^&*()_+-={}[]|\\:";\'<>?,./~`';

      const task = new TaskBuilder()
        .withTitle(`Task with ${specialChars}`)
        .withNotes(`Notes with ${specialChars}`)
        .build();

      const markdown = convertTasksToMarkdown([task]);

      expect(markdown).toContain(specialChars);
    });
  });

  describe('Data Validation', () => {
    it('should validate task structure', () => {
      const validTask = new TaskBuilder().build();
      const invalidTask = { title: 'Missing required fields' };

      // Custom validation function
      const isValidTask = (task: any): boolean => {
        return !!(
          task.id &&
          task.title &&
          typeof task.isDone === 'boolean' &&
          task.projectId
        );
      };

      expect(isValidTask(validTask)).toBe(true);
      expect(isValidTask(invalidTask)).toBe(false);
    });

    it('should validate parsed task structure', () => {
      const validParsed = new ParsedTaskBuilder().build();
      const invalidParsed = { title: 'Missing fields' };

      const isValidParsedTask = (task: any): boolean => {
        return (
          typeof task.line === 'number' &&
          typeof task.indent === 'number' &&
          typeof task.completed === 'boolean' &&
          !!task.title
        );
      };

      expect(isValidParsedTask(validParsed)).toBe(true);
      expect(isValidParsedTask(invalidParsed)).toBe(false);
    });
  });

  describe('Sync State Consistency', () => {
    it('should maintain consistency through multiple sync cycles', async () => {
      const initialTasks = createTaskHierarchy({
        parentCount: 5,
        childrenPerParent: 3,
      });

      // First cycle: SP to MD
      const markdown1 = convertTasksToMarkdown(initialTasks);

      // Second cycle: MD to SP - parse the actual markdown
      const result = parseMarkdownWithHeader(markdown1);
      const parsed = result.tasks;

      // Verify consistency
      expect(parsed).toHaveLength(initialTasks.length);
      parsed.forEach((parsedTask, index) => {
        const originalTask = initialTasks.find((t) => t.id === parsedTask.id);
        expect(parsedTask.title).toBe(originalTask?.title);
        expect(parsedTask.completed).toBe(originalTask?.isDone);
      });
    });
  });
});
