import { Task } from '@super-productivity/plugin-api';
import { parseMarkdown } from '../../sync/markdown-parser';
import { convertTasksToMarkdown } from '../../sync/sp-to-md';
import { generateTaskOperations } from '../../sync/generate-task-operations';

describe('Integration Tests - Full Sync Workflows', () => {
  const projectId = 'test-project-id';

  // Mock data builders
  const createMockTask = (overrides: Partial<Task> = {}): Task =>
    ({
      id: 'default-id',
      title: 'Default Task',
      isDone: false,
      parentId: null,
      projectId,
      notes: '',
      ...overrides,
    }) as Task;

  const createTaskHierarchy = (parentId: string, childCount: number): Task[] => {
    const tasks: Task[] = [];

    // Create parent task
    tasks.push(
      createMockTask({
        id: parentId,
        title: `Parent Task ${parentId}`,
        isDone: false,
        parentId: null,
      }),
    );

    // Create child tasks
    for (let i = 1; i <= childCount; i++) {
      tasks.push(
        createMockTask({
          id: `${parentId}-child-${i}`,
          title: `Child Task ${i}`,
          isDone: i % 2 === 0, // Make every second child completed
          parentId,
        }),
      );
    }

    return tasks;
  };

  describe('Round-trip Conversion', () => {
    it('should maintain task data integrity through MD → SP → MD conversion', () => {
      const originalMarkdown = `- [ ] <!--parent1--> Parent Task 1
  - [ ] <!--child1--> Child Task 1
  - [x] <!--child2--> Child Task 2
    This is a note for child task 2
- [x] <!--parent2--> Parent Task 2
  - [ ] <!--child3--> Child Task 3
    Another note with multiple lines
    Second line of the note`;

      // Step 1: Parse markdown to internal format
      const parsedTasks = parseMarkdown(originalMarkdown);

      // Step 2: Convert to SP Task format
      const spTasks: Task[] = parsedTasks.map(
        (task) =>
          ({
            id: task.id || `generated-${task.line}`,
            title: task.title,
            isDone: task.completed,
            parentId: task.parentId,
            projectId,
            notes: task.notes || '',
          }) as Task,
      );

      // Step 3: Convert back to markdown
      const regeneratedMarkdown = convertTasksToMarkdown(spTasks);

      // Step 4: Parse regenerated markdown
      const reparsedTasks = parseMarkdown(regeneratedMarkdown);

      // Verify task count remains the same
      expect(reparsedTasks).toHaveLength(parsedTasks.length);

      // Verify task structure integrity
      for (let i = 0; i < parsedTasks.length; i++) {
        const original = parsedTasks[i];
        const regenerated = reparsedTasks[i];

        expect(regenerated.title).toBe(original.title);
        expect(regenerated.completed).toBe(original.completed);
        expect(regenerated.isSubtask).toBe(original.isSubtask);
        expect(regenerated.notes).toBe(original.notes);
      }
    });

    it('should handle empty and minimal markdown correctly', () => {
      const emptyMarkdown = '';
      const parsedEmpty = parseMarkdown(emptyMarkdown);
      expect(parsedEmpty).toHaveLength(0);

      const minimalMarkdown = '- [ ] Single task';
      const parsedMinimal = parseMarkdown(minimalMarkdown);
      expect(parsedMinimal).toHaveLength(1);
      expect(parsedMinimal[0].title).toBe('Single task');
    });

    it('should preserve parent-child relationships through conversions', () => {
      const tasks = createTaskHierarchy('parent-1', 3);

      // Convert to markdown
      const markdown = convertTasksToMarkdown(tasks);

      // Parse back to internal format
      const parsedTasks = parseMarkdown(markdown);

      // Verify parent task
      const parentTask = parsedTasks.find((t) => t.id === 'parent-1');
      expect(parentTask).toBeDefined();
      expect(parentTask!.isSubtask).toBe(false);
      expect(parentTask!.parentId).toBe(null);

      // Verify child tasks
      const childTasks = parsedTasks.filter((t) => t.parentId === 'parent-1');
      expect(childTasks).toHaveLength(3);

      childTasks.forEach((child) => {
        expect(child.isSubtask).toBe(true);
        expect(child.parentId).toBe('parent-1');
      });
    });
  });

  describe('Sync Operation Generation', () => {
    it('should generate correct operations for new tasks', () => {
      const markdownTasks = parseMarkdown(`- [ ] <!--new-task--> New Task
  - [ ] <!--new-subtask--> New Subtask`);

      const existingSpTasks: Task[] = [];

      const operations = generateTaskOperations(
        markdownTasks,
        existingSpTasks,
        projectId,
      );

      expect(operations).toHaveLength(3); // 2 creates + 1 reorder

      // Check create operations
      const createOps = operations.filter((op) => op.type === 'create');
      expect(createOps).toHaveLength(2);

      expect(createOps[0].data.title).toBe('New Task');
      expect(createOps[0].data.parentId).toBeUndefined();

      expect(createOps[1].data.title).toBe('New Subtask');
      expect(createOps[1].data.parentId).toBe('new-task');
    });

    it('should generate correct operations for updated tasks', () => {
      const markdownTasks = parseMarkdown(`- [x] <!--existing-task--> Updated Task Title
  - [ ] <!--existing-subtask--> Updated Subtask
    Updated note content`);

      const existingSpTasks: Task[] = [
        createMockTask({
          id: 'existing-task',
          title: 'Original Task Title',
          isDone: false,
          parentId: null,
        }),
        createMockTask({
          id: 'existing-subtask',
          title: 'Original Subtask',
          isDone: false,
          parentId: 'existing-task',
          notes: 'Original note',
        }),
      ];

      const operations = generateTaskOperations(
        markdownTasks,
        existingSpTasks,
        projectId,
      );

      const updateOps = operations.filter((op) => op.type === 'update');
      expect(updateOps).toHaveLength(2);

      // Check parent task update
      const parentUpdate = updateOps.find((op) => op.taskId === 'existing-task');
      expect(parentUpdate?.updates.title).toBe('Updated Task Title');
      expect(parentUpdate?.updates.isDone).toBe(true);

      // Check subtask update
      const subtaskUpdate = updateOps.find((op) => op.taskId === 'existing-subtask');
      expect(subtaskUpdate?.updates.title).toBe('Updated Subtask');
      expect(subtaskUpdate?.updates.notes).toBe('Updated note content');
    });

    it('should generate correct operations for deleted tasks', () => {
      const markdownTasks = parseMarkdown(`- [ ] <!--remaining-task--> Remaining Task`);

      const existingSpTasks: Task[] = [
        createMockTask({
          id: 'remaining-task',
          title: 'Remaining Task',
          isDone: false,
        }),
        createMockTask({
          id: 'deleted-task',
          title: 'Task to Delete',
          isDone: false,
        }),
      ];

      const operations = generateTaskOperations(
        markdownTasks,
        existingSpTasks,
        projectId,
      );

      const deleteOps = operations.filter((op) => op.type === 'delete');
      expect(deleteOps).toHaveLength(1);
      expect(deleteOps[0].taskId).toBe('deleted-task');
    });

    it('should handle complex sync scenarios with mixed operations', () => {
      const markdownTasks = parseMarkdown(`- [x] <!--existing-1--> Updated Existing Task
  - [ ] <!--new-subtask--> New Subtask
- [ ] <!--new-parent--> New Parent Task
  - [x] <!--existing-2--> Moved Existing Task`);

      const existingSpTasks: Task[] = [
        createMockTask({
          id: 'existing-1',
          title: 'Original Existing Task',
          isDone: false,
          parentId: null,
        }),
        createMockTask({
          id: 'existing-2',
          title: 'Moved Existing Task',
          isDone: false,
          parentId: null, // Originally a parent, now becomes subtask
        }),
        createMockTask({
          id: 'deleted-task',
          title: 'Task to Delete',
          isDone: false,
        }),
      ];

      const operations = generateTaskOperations(
        markdownTasks,
        existingSpTasks,
        projectId,
      );

      // Should have: 2 creates, 2 updates, 1 delete, 1 reorder
      const createOps = operations.filter((op) => op.type === 'create');
      const updateOps = operations.filter((op) => op.type === 'update');
      const deleteOps = operations.filter((op) => op.type === 'delete');
      const reorderOps = operations.filter((op) => op.type === 'reorder');

      expect(createOps).toHaveLength(2); // New subtask + new parent
      expect(updateOps).toHaveLength(2); // Updated existing tasks
      expect(deleteOps).toHaveLength(1); // Deleted task
      expect(reorderOps).toHaveLength(1); // Reorder parent tasks

      // Verify create operations
      expect(createOps.find((op) => op.data.title === 'New Subtask')).toBeDefined();
      expect(createOps.find((op) => op.data.title === 'New Parent Task')).toBeDefined();

      // Verify updates
      const existingUpdate = updateOps.find((op) => op.taskId === 'existing-1');
      expect(existingUpdate?.updates.isDone).toBe(true);

      const movedUpdate = updateOps.find((op) => op.taskId === 'existing-2');
      expect(movedUpdate?.updates.parentId).toBe('new-parent');

      // Verify delete
      expect(deleteOps[0].taskId).toBe('deleted-task');
    });
  });

  describe('Error Handling in Integration', () => {
    it('should handle sync operations with invalid data gracefully', () => {
      const markdownTasks = parseMarkdown(`- [ ] <!--invalid-parent--> Parent Task
  - [ ] Child with invalid parent reference`);

      // Child task references a parent that doesn't exist in markdown
      const childWithInvalidParent = markdownTasks.find(
        (t) => t.title === 'Child with invalid parent reference',
      );
      expect(childWithInvalidParent?.parentId).toBe('invalid-parent');

      const existingSpTasks: Task[] = [];

      // Should not throw error, should handle gracefully
      expect(() => {
        generateTaskOperations(markdownTasks, existingSpTasks, projectId);
      }).not.toThrow();
    });

    it('should handle duplicate IDs in markdown', () => {
      const markdownTasks = parseMarkdown(`- [ ] <!--duplicate-id--> Task 1
- [x] <!--duplicate-id--> Task 2`);

      const existingSpTasks: Task[] = [];

      const operations = generateTaskOperations(
        markdownTasks,
        existingSpTasks,
        projectId,
      );

      // Should handle duplicate IDs without crashing
      expect(operations.length).toBeGreaterThan(0);
    });

    it('should handle missing IDs in markdown tasks', () => {
      const markdownTasks = parseMarkdown(`- [ ] Task without ID
- [x] <!--with-id--> Task with ID
- [ ] Another task without ID`);

      const existingSpTasks: Task[] = [];

      const operations = generateTaskOperations(
        markdownTasks,
        existingSpTasks,
        projectId,
      );

      // Should create operations for tasks without IDs
      const createOps = operations.filter((op) => op.type === 'create');
      expect(createOps).toHaveLength(3); // All tasks should be created
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large task lists efficiently', () => {
      const largeTaskCount = 1000;
      const tasks: Task[] = [];

      // Create large number of tasks
      for (let i = 0; i < largeTaskCount; i++) {
        tasks.push(
          createMockTask({
            id: `task-${i}`,
            title: `Task ${i}`,
            isDone: i % 2 === 0,
          }),
        );
      }

      // Convert to markdown and back
      const start = performance.now();

      const markdown = convertTasksToMarkdown(tasks);
      const parsedTasks = parseMarkdown(markdown);

      const end = performance.now();
      const duration = end - start;

      // Should complete within reasonable time (< 100ms for 1000 tasks)
      expect(duration).toBeLessThan(100);
      expect(parsedTasks).toHaveLength(largeTaskCount);
    });

    it('should handle deeply nested task structures', () => {
      const markdown = `- [ ] <!--parent--> Parent
  - [ ] <!--child--> Child
    - [ ] Deep note 1
    - [ ] Deep note 2
      - [ ] Even deeper note
        - [ ] Very deep note
          - [ ] Extremely deep note`;

      const parsedTasks = parseMarkdown(markdown);

      // With 4-space indent being most common, the 2-space task is not a subtask
      // We get: parent (depth 0), child (depth 0), and 4-space tasks as subtasks
      expect(parsedTasks).toHaveLength(5); // Parent, child, and 3 subtasks of child

      // The 4-space tasks become subtasks of child
      const deepNote1 = parsedTasks.find((t) => t.title === 'Deep note 1');
      expect(deepNote1?.parentId).toBe('child');
      expect(deepNote1?.isSubtask).toBe(true);

      // The 6+ space content becomes notes
      const evenDeeperTask = parsedTasks.find((t) => t.title === 'Even deeper note');
      expect(evenDeeperTask?.notes).toContain('Very deep note');
      expect(evenDeeperTask?.notes).toContain('Extremely deep note');
    });

    it('should handle markdown with mixed content types', () => {
      const markdown = `# Project Title

This is a description of the project.

- [ ] <!--task1--> First task
- [x] <!--task2--> Second task

## Section Header

More text content here.

- [ ] <!--task3--> Third task
  - [ ] <!--subtask1--> Subtask

**Bold text**

- [ ] Final task without ID

_End of document_`;

      const parsedTasks = parseMarkdown(markdown);

      // Should extract only the task items
      expect(parsedTasks).toHaveLength(5);
      expect(parsedTasks[0].title).toBe('First task');
      expect(parsedTasks[1].title).toBe('Second task');
      expect(parsedTasks[2].title).toBe('Third task');
      expect(parsedTasks[3].title).toBe('Subtask');
      expect(parsedTasks[4].title).toBe('Final task without ID');

      // Check parent-child relationship
      expect(parsedTasks[3].parentId).toBe('task3');
    });
  });

  describe('Data Consistency Validation', () => {
    it('should maintain ID consistency across operations', () => {
      const originalTasks: Task[] = [
        createMockTask({
          id: 'parent-1',
          title: 'Parent Task',
          parentId: null,
        }),
        createMockTask({
          id: 'child-1',
          title: 'Child Task',
          parentId: 'parent-1',
        }),
      ];

      // Convert to markdown
      const markdown = convertTasksToMarkdown(originalTasks);

      // Parse back and generate operations
      const parsedTasks = parseMarkdown(markdown);
      const operations = generateTaskOperations(parsedTasks, originalTasks, projectId);

      // Should have minimal operations (only reorder and subTaskIds update)
      // Now we expect one update operation for the parent's subTaskIds
      const updateOps = operations.filter((op) => op.type === 'update');
      expect(updateOps).toHaveLength(1);
      expect(updateOps[0].taskId).toBe('parent-1');
      expect(updateOps[0].updates.subTaskIds).toEqual(['child-1']);

      expect(operations.filter((op) => op.type === 'create')).toHaveLength(0);
      expect(operations.filter((op) => op.type === 'delete')).toHaveLength(0);
    });

    it('should handle parent-child relationship changes correctly', () => {
      const existingTasks: Task[] = [
        createMockTask({
          id: 'task-1',
          title: 'Task 1',
          parentId: null,
        }),
        createMockTask({
          id: 'task-2',
          title: 'Task 2',
          parentId: 'task-1',
        }),
      ];

      // Change hierarchy in markdown (task-2 becomes parent, task-1 becomes child)
      const newMarkdown = `- [ ] <!--task-2--> Task 2
  - [ ] <!--task-1--> Task 1`;

      const parsedTasks = parseMarkdown(newMarkdown);
      const operations = generateTaskOperations(parsedTasks, existingTasks, projectId);

      // Should have updates to change parent-child relationships
      const updateOps = operations.filter((op) => op.type === 'update');
      expect(updateOps).toHaveLength(2);

      // task-1 should now have task-2 as parent
      const task1Update = updateOps.find((op) => op.taskId === 'task-1');
      expect(task1Update?.updates.parentId).toBe('task-2');

      // task-2 should now have no parent
      const task2Update = updateOps.find((op) => op.taskId === 'task-2');
      expect(task2Update?.updates.parentId).toBe(null);
    });
  });
});
