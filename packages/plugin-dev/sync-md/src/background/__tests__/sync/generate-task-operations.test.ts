import { Task } from '@super-productivity/plugin-api';
import { generateTaskOperations } from '../../sync/generate-task-operations';
import { parseMarkdown } from '../../sync/markdown-parser';

describe('generateTaskOperations', () => {
  const projectId = 'test-project-id';

  // Helper to create mock tasks
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

  describe('Create Operations', () => {
    it('should generate create operations for new tasks without IDs', () => {
      const markdownTasks = parseMarkdown(`- [ ] Task without ID
- [x] Another task without ID`);

      const existingTasks: Task[] = [];

      const operations = generateTaskOperations(markdownTasks, existingTasks, projectId);

      const createOps = operations.filter((op) => op.type === 'create');
      expect(createOps).toHaveLength(2);
      expect(createOps[0].data.title).toBe('Task without ID');
      expect(createOps[0].data.isDone).toBe(false);
      expect(createOps[1].data.title).toBe('Another task without ID');
      expect(createOps[1].data.isDone).toBe(true);
    });

    it('should generate create operations for tasks with new IDs', () => {
      const markdownTasks = parseMarkdown(`- [ ] <!--new-id-1--> New task 1
- [ ] <!--new-id-2--> New task 2`);

      const existingTasks: Task[] = [
        createMockTask({ id: 'existing-id', title: 'Existing task' }),
      ];

      const operations = generateTaskOperations(markdownTasks, existingTasks, projectId);

      const createOps = operations.filter((op) => op.type === 'create');
      expect(createOps).toHaveLength(2);
      // IDs from markdown are used for matching but not included in create operations
      expect(createOps[0].data.title).toBe('New task 1');
      expect(createOps[1].data.title).toBe('New task 2');
    });

    it('should handle parent-child relationships in create operations', () => {
      const markdownTasks = parseMarkdown(`- [ ] <!--parent-id--> Parent task
  - [ ] <!--child-id--> Child task
  - [ ] Another child without ID`);

      const existingTasks: Task[] = [];

      const operations = generateTaskOperations(markdownTasks, existingTasks, projectId);

      const createOps = operations.filter((op) => op.type === 'create');
      expect(createOps).toHaveLength(3);

      // Parent task (parentId should not be included when null)
      expect(createOps[0].data.title).toBe('Parent task');
      expect(createOps[0].data.parentId).toBeUndefined();

      // Child with ID
      expect(createOps[1].data.title).toBe('Child task');
      expect(createOps[1].data.parentId).toBe('parent-id');

      // Child without ID
      expect(createOps[2].data.parentId).toBe('parent-id');
    });
  });

  describe('Update Operations', () => {
    it('should generate update operations for changed titles', () => {
      const markdownTasks = parseMarkdown(`- [ ] <!--task1--> Updated title
- [x] <!--task2--> Another updated title`);

      const existingTasks: Task[] = [
        createMockTask({ id: 'task1', title: 'Original title', isDone: false }),
        createMockTask({ id: 'task2', title: 'Original title 2', isDone: true }),
      ];

      const operations = generateTaskOperations(markdownTasks, existingTasks, projectId);

      const updateOps = operations.filter((op) => op.type === 'update');
      expect(updateOps).toHaveLength(2);
      expect(updateOps[0].taskId).toBe('task1');
      expect(updateOps[0].updates.title).toBe('Updated title');
      expect(updateOps[1].taskId).toBe('task2');
      expect(updateOps[1].updates.title).toBe('Another updated title');
    });

    it('should generate update operations for changed completion status', () => {
      const markdownTasks = parseMarkdown(`- [x] <!--task1--> Task 1
- [ ] <!--task2--> Task 2`);

      const existingTasks: Task[] = [
        createMockTask({ id: 'task1', title: 'Task 1', isDone: false }),
        createMockTask({ id: 'task2', title: 'Task 2', isDone: true }),
      ];

      const operations = generateTaskOperations(markdownTasks, existingTasks, projectId);

      const updateOps = operations.filter((op) => op.type === 'update');
      expect(updateOps).toHaveLength(2);
      expect(updateOps[0].updates.isDone).toBe(true);
      expect(updateOps[1].updates.isDone).toBe(false);
    });

    it('should generate update operations for changed notes', () => {
      const markdownTasks = parseMarkdown(`- [ ] <!--task1--> Task with notes
  This is a new note
  Second line of new note`);

      const existingTasks: Task[] = [
        createMockTask({ id: 'task1', title: 'Task with notes', notes: 'Old note' }),
      ];

      const operations = generateTaskOperations(markdownTasks, existingTasks, projectId);

      const updateOps = operations.filter((op) => op.type === 'update');
      expect(updateOps).toHaveLength(1);
      expect(updateOps[0].updates.notes).toBe(
        'This is a new note\nSecond line of new note',
      );
    });

    it('should not generate update operations when nothing changed', () => {
      const markdownTasks = parseMarkdown(`- [ ] <!--task1--> Same title
- [x] <!--task2--> Another same title`);

      const existingTasks: Task[] = [
        createMockTask({ id: 'task1', title: 'Same title', isDone: false }),
        createMockTask({ id: 'task2', title: 'Another same title', isDone: true }),
      ];

      const operations = generateTaskOperations(markdownTasks, existingTasks, projectId);

      const updateOps = operations.filter((op) => op.type === 'update');
      expect(updateOps).toHaveLength(0);
    });

    it('should handle parent changes in update operations', () => {
      const markdownTasks = parseMarkdown(`- [ ] <!--parent--> Parent
  - [ ] <!--child--> Child moved to parent`);

      const existingTasks: Task[] = [
        createMockTask({ id: 'parent', title: 'Parent', parentId: null }),
        createMockTask({ id: 'child', title: 'Child moved to parent', parentId: null }),
      ];

      const operations = generateTaskOperations(markdownTasks, existingTasks, projectId);

      const updateOps = operations.filter((op) => op.type === 'update');
      expect(updateOps).toHaveLength(2); // Now we also update parent's subTaskIds

      const childUpdate = updateOps.find((op) => op.taskId === 'child');
      expect(childUpdate).toBeDefined();
      expect(childUpdate?.updates.parentId).toBe('parent');

      const parentUpdate = updateOps.find((op) => op.taskId === 'parent');
      expect(parentUpdate).toBeDefined();
      expect(parentUpdate?.updates.subTaskIds).toEqual(['child']);
    });
  });

  describe('Delete Operations', () => {
    it('should generate delete operations for removed tasks', () => {
      const markdownTasks = parseMarkdown(`- [ ] <!--keep1--> Keep this task`);

      const existingTasks: Task[] = [
        createMockTask({ id: 'keep1', title: 'Keep this task' }),
        createMockTask({ id: 'delete1', title: 'Delete this task' }),
        createMockTask({ id: 'delete2', title: 'Delete this too' }),
      ];

      const operations = generateTaskOperations(markdownTasks, existingTasks, projectId);

      const deleteOps = operations.filter((op) => op.type === 'delete');
      expect(deleteOps).toHaveLength(2);
      expect(deleteOps[0].taskId).toBe('delete1');
      expect(deleteOps[1].taskId).toBe('delete2');
    });

    it('should handle deletion of parent tasks with children', () => {
      const markdownTasks = parseMarkdown(`- [ ] <!--other-task--> Other task`);

      const existingTasks: Task[] = [
        createMockTask({ id: 'parent-to-delete', title: 'Parent', parentId: null }),
        createMockTask({
          id: 'child-to-delete',
          title: 'Child',
          parentId: 'parent-to-delete',
        }),
        createMockTask({ id: 'other-task', title: 'Other task' }),
      ];

      const operations = generateTaskOperations(markdownTasks, existingTasks, projectId);

      const deleteOps = operations.filter((op) => op.type === 'delete');
      expect(deleteOps).toHaveLength(2);
      // Both parent and child should be deleted
      expect(deleteOps.find((op) => op.taskId === 'parent-to-delete')).toBeDefined();
      expect(deleteOps.find((op) => op.taskId === 'child-to-delete')).toBeDefined();
    });
  });

  describe('Reorder Operations', () => {
    it('should update parent subTaskIds when subtask order changes', () => {
      const markdownTasks = parseMarkdown(`- [ ] <!--parent1--> Parent Task
  - [ ] <!--sub2--> Subtask 2
  - [ ] <!--sub1--> Subtask 1`);

      const existingTasks: Task[] = [
        createMockTask({
          id: 'parent1',
          title: 'Parent Task',
          parentId: null,
          subTaskIds: ['sub1', 'sub2'], // Original order
        }),
        createMockTask({
          id: 'sub1',
          title: 'Subtask 1',
          parentId: 'parent1',
        }),
        createMockTask({
          id: 'sub2',
          title: 'Subtask 2',
          parentId: 'parent1',
        }),
      ];

      const operations = generateTaskOperations(markdownTasks, existingTasks, projectId);

      // Should generate an update operation for the parent with new subtask order
      const updateOps = operations.filter((op) => op.type === 'update');
      const parentUpdate = updateOps.find((op) => op.taskId === 'parent1');
      expect(parentUpdate).toBeDefined();
      expect(parentUpdate?.updates.subTaskIds).toEqual(['sub2', 'sub1']);
    });

    it('should generate reorder operations when task order changes', () => {
      const markdownTasks = parseMarkdown(`- [ ] <!--task2--> Task 2
- [ ] <!--task1--> Task 1
- [ ] <!--task3--> Task 3`);

      const existingTasks: Task[] = [
        createMockTask({ id: 'task1', title: 'Task 1' }),
        createMockTask({ id: 'task2', title: 'Task 2' }),
        createMockTask({ id: 'task3', title: 'Task 3' }),
      ];

      const operations = generateTaskOperations(markdownTasks, existingTasks, projectId);

      const reorderOps = operations.filter((op) => op.type === 'reorder');
      expect(reorderOps).toHaveLength(1);
      expect(reorderOps[0].taskIds).toEqual(['task2', 'task1', 'task3']);
    });

    it('should not generate reorder operations when order is the same', () => {
      const markdownTasks = parseMarkdown(`- [ ] <!--task1--> Task 1
- [ ] <!--task2--> Task 2`);

      const existingTasks: Task[] = [
        createMockTask({ id: 'task1', title: 'Task 1' }),
        createMockTask({ id: 'task2', title: 'Task 2' }),
      ];

      const operations = generateTaskOperations(markdownTasks, existingTasks, projectId);

      const reorderOps = operations.filter((op) => op.type === 'reorder');
      // Reorder operation is always generated to ensure correct task order
      expect(reorderOps).toHaveLength(1);
      expect(reorderOps[0].taskIds).toEqual(['task1', 'task2']);
    });
  });

  describe('Mixed Operations', () => {
    it('should handle complex scenarios with all operation types', () => {
      const markdownTasks = parseMarkdown(`- [ ] <!--existing1--> Updated existing task
- [ ] <!--new-task--> Brand new task
  - [x] <!--moved-child--> Child moved here
- [ ] <!--existing2--> Unchanged task`);

      const existingTasks: Task[] = [
        createMockTask({ id: 'existing1', title: 'Original title', isDone: false }),
        createMockTask({ id: 'existing2', title: 'Unchanged task', isDone: false }),
        createMockTask({
          id: 'moved-child',
          title: 'Child moved here',
          isDone: false,
          parentId: null,
        }),
        createMockTask({ id: 'deleted-task', title: 'This will be deleted' }),
      ];

      const operations = generateTaskOperations(markdownTasks, existingTasks, projectId);

      // Check create operations
      const createOps = operations.filter((op) => op.type === 'create');
      expect(createOps).toHaveLength(1);
      expect(createOps[0].data.title).toBe('Brand new task');

      // Check update operations
      const updateOps = operations.filter((op) => op.type === 'update');
      expect(updateOps).toHaveLength(2);

      const titleUpdate = updateOps.find((op) => op.taskId === 'existing1');
      expect(titleUpdate?.updates.title).toBe('Updated existing task');

      const parentUpdate = updateOps.find((op) => op.taskId === 'moved-child');
      expect(parentUpdate?.updates.parentId).toBe('new-task');
      expect(parentUpdate?.updates.isDone).toBe(true);

      // Check delete operations
      const deleteOps = operations.filter((op) => op.type === 'delete');
      expect(deleteOps).toHaveLength(1);
      expect(deleteOps[0].taskId).toBe('deleted-task');

      // Check reorder operations
      const reorderOps = operations.filter((op) => op.type === 'reorder');
      expect(reorderOps).toHaveLength(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty markdown', () => {
      const markdownTasks = parseMarkdown('');
      const existingTasks: Task[] = [createMockTask({ id: 'task1', title: 'Task 1' })];

      const operations = generateTaskOperations(markdownTasks, existingTasks, projectId);

      // Should delete all existing tasks
      expect(operations).toHaveLength(1);
      expect(operations[0].type).toBe('delete');
    });

    it('should handle tasks with same title but different IDs', () => {
      const markdownTasks = parseMarkdown(`- [ ] <!--id1--> Duplicate title
- [ ] <!--id2--> Duplicate title`);

      const existingTasks: Task[] = [];

      const operations = generateTaskOperations(markdownTasks, existingTasks, projectId);

      const createOps = operations.filter((op) => op.type === 'create');
      expect(createOps).toHaveLength(2);
      // Both tasks have the same title
      expect(createOps[0].data.title).toBe('Duplicate title');
      expect(createOps[1].data.title).toBe('Duplicate title');
    });

    it('should handle cyclic parent-child relationships gracefully', () => {
      const markdownTasks = parseMarkdown(`- [ ] <!--parent--> Parent
  - [ ] <!--child--> Child`);

      // Existing tasks have cyclic relationship (shouldn't happen but test resilience)
      const existingTasks: Task[] = [
        createMockTask({ id: 'parent', title: 'Parent', parentId: 'child' }),
        createMockTask({ id: 'child', title: 'Child', parentId: 'parent' }),
      ];

      const operations = generateTaskOperations(markdownTasks, existingTasks, projectId);

      const updateOps = operations.filter((op) => op.type === 'update');
      // Should fix the parent relationship
      const parentUpdate = updateOps.find((op) => op.taskId === 'parent');
      expect(parentUpdate?.updates.parentId).toBe(null);
    });

    it('should preserve notes with special characters', () => {
      const markdownTasks = parseMarkdown(`- [ ] <!--task1--> Task with special notes
  Code block: \`const x = 5;\`
  Link: [Google](https://google.com)
  **Bold** and _italic_`);

      const existingTasks: Task[] = [];

      const operations = generateTaskOperations(markdownTasks, existingTasks, projectId);

      const createOps = operations.filter((op) => op.type === 'create');
      expect(createOps[0].data.notes).toContain('`const x = 5;`');
      expect(createOps[0].data.notes).toContain('[Google](https://google.com)');
      expect(createOps[0].data.notes).toContain('**Bold** and _italic_');
    });
  });
});
