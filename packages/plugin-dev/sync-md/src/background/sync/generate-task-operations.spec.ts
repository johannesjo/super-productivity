import { generateTaskOperations } from './generate-task-operations';
import { ParsedTask } from './markdown-parser';
import { Task } from '@super-productivity/plugin-api';

describe('generateTaskOperations', () => {
  describe('when parent task gains new subtasks', () => {
    it('should update parent task with subTaskIds, not set parentId to null', () => {
      // Existing state: just a parent task
      const spTasks: Task[] = [
        {
          id: 'E5kE65eTZ3lZS0wS3gTIB',
          title: 'a',
          isDone: false,
          projectId: 'test-project',
          subTaskIds: [],
        },
      ];

      // Markdown state: parent task with new subtasks
      const mdTasks: ParsedTask[] = [
        {
          line: 0,
          indent: 0,
          completed: false,
          id: 'E5kE65eTZ3lZS0wS3gTIB',
          title: 'a',
          originalLine: '- [ ] <!--E5kE65eTZ3lZS0wS3gTIB--> a',
          parentId: null,
          isSubtask: false,
          depth: 0,
        },
        {
          line: 1,
          indent: 2,
          completed: false,
          id: null,
          title: '1',
          originalLine: '    - [ ] 1',
          parentId: 'E5kE65eTZ3lZS0wS3gTIB',
          isSubtask: true,
          depth: 1,
        },
        {
          line: 2,
          indent: 2,
          completed: false,
          id: null,
          title: '2',
          originalLine: '    - [ ] 2',
          parentId: 'E5kE65eTZ3lZS0wS3gTIB',
          isSubtask: true,
          depth: 1,
        },
        {
          line: 3,
          indent: 2,
          completed: false,
          id: null,
          title: '3',
          originalLine: '    - [ ] 3',
          parentId: 'E5kE65eTZ3lZS0wS3gTIB',
          isSubtask: true,
          depth: 1,
        },
      ];

      const operations = generateTaskOperations(mdTasks, spTasks, 'test-project');

      // Should NOT have an update operation that sets parentId to null
      const parentUpdate = operations.find(
        (op) => op.type === 'update' && op.taskId === 'E5kE65eTZ3lZS0wS3gTIB',
      );

      expect(parentUpdate).toBeDefined();
      expect(parentUpdate?.type).toBe('update');

      // The parent task should NOT have parentId: null in updates
      if (parentUpdate?.type === 'update') {
        expect(parentUpdate.updates.parentId).toBeUndefined();
        // Instead, it should have subTaskIds
        expect(parentUpdate.updates.subTaskIds).toBeDefined();
        expect(parentUpdate.updates.subTaskIds).toHaveLength(3);
      }

      // Should create the three subtasks with correct parentId
      const createOps = operations.filter((op) => op.type === 'create');
      expect(createOps).toHaveLength(3);

      createOps.forEach((op) => {
        if (op.type === 'create') {
          expect(op.data.parentId).toBe('E5kE65eTZ3lZS0wS3gTIB');
        }
      });

      // Reorder should include the parent task
      const reorderOp = operations.find((op) => op.type === 'reorder');
      expect(reorderOp).toBeDefined();
      if (reorderOp?.type === 'reorder') {
        expect(reorderOp.taskIds).toContain('E5kE65eTZ3lZS0wS3gTIB');
      }
    });
  });

  describe('when matching tasks by title', () => {
    it('should match existing task by title when markdown task has no ID', () => {
      // Existing SP task with ID but no markdown ID reference
      const spTasks: Task[] = [
        {
          id: 'existing-task-id',
          title: 'Important Task',
          isDone: false,
          projectId: 'test-project',
          notes: 'Old notes',
        },
      ];

      // Markdown task with same title but no ID
      const mdTasks: ParsedTask[] = [
        {
          line: 0,
          indent: 0,
          completed: true,
          id: null,
          title: 'Important Task',
          originalLine: '- [x] Important Task',
          parentId: null,
          isSubtask: false,
          depth: 0,
          notes: 'New notes',
        },
      ];

      const operations = generateTaskOperations(mdTasks, spTasks, 'test-project');

      // Should update the existing task (matched by title)
      const updateOp = operations.find(
        (op) => op.type === 'update' && op.taskId === 'existing-task-id',
      );

      expect(updateOp).toBeDefined();
      expect(updateOp?.type).toBe('update');

      if (updateOp?.type === 'update') {
        expect(updateOp.updates.isDone).toBe(true);
        expect(updateOp.updates.notes).toBe('New notes');
      }

      // Should NOT create a new task
      const createOps = operations.filter((op) => op.type === 'create');
      expect(createOps).toHaveLength(0);
    });

    it('should not match same task twice by title', () => {
      // Existing SP tasks
      const spTasks: Task[] = [
        {
          id: 'task-1',
          title: 'Duplicate Title',
          isDone: false,
          projectId: 'test-project',
        },
        {
          id: 'task-2',
          title: 'Another Task',
          isDone: false,
          projectId: 'test-project',
        },
      ];

      // Two markdown tasks with no IDs - first should match, second should create new
      const mdTasks: ParsedTask[] = [
        {
          line: 0,
          indent: 0,
          completed: false,
          id: null,
          title: 'Duplicate Title',
          originalLine: '- [ ] Duplicate Title',
          parentId: null,
          isSubtask: false,
          depth: 0,
        },
        {
          line: 1,
          indent: 0,
          completed: false,
          id: null,
          title: 'Duplicate Title',
          originalLine: '- [ ] Duplicate Title',
          parentId: null,
          isSubtask: false,
          depth: 0,
        },
      ];

      const operations = generateTaskOperations(mdTasks, spTasks, 'test-project');

      // Should have one update (first match by title)
      const updateOps = operations.filter((op) => op.type === 'update');
      expect(updateOps).toHaveLength(0); // No updates since nothing changed

      // Should create one new task (second duplicate)
      const createOps = operations.filter((op) => op.type === 'create');
      expect(createOps).toHaveLength(1);

      if (createOps[0]?.type === 'create') {
        expect(createOps[0].data.title).toBe('Duplicate Title');
      }
    });

    it('should handle parent relationship changes when matching by title', () => {
      // Existing task that will become a subtask
      const spTasks: Task[] = [
        {
          id: 'parent-task',
          title: 'Parent Task',
          isDone: false,
          projectId: 'test-project',
          subTaskIds: [],
        },
        {
          id: 'child-task',
          title: 'Child Task',
          isDone: false,
          projectId: 'test-project',
          parentId: undefined, // Currently a root task
        },
      ];

      // Markdown shows the task as a subtask
      const mdTasks: ParsedTask[] = [
        {
          line: 0,
          indent: 0,
          completed: false,
          id: 'parent-task',
          title: 'Parent Task',
          originalLine: '- [ ] <!--parent-task--> Parent Task',
          parentId: null,
          isSubtask: false,
          depth: 0,
        },
        {
          line: 1,
          indent: 2,
          completed: false,
          id: null, // No ID, will match by title
          title: 'Child Task',
          originalLine: '  - [ ] Child Task',
          parentId: 'parent-task',
          isSubtask: true,
          depth: 1,
        },
      ];

      const operations = generateTaskOperations(mdTasks, spTasks, 'test-project');

      // Should update the child task to have the parent
      const childUpdateOp = operations.find(
        (op) => op.type === 'update' && op.taskId === 'child-task',
      );

      expect(childUpdateOp).toBeDefined();
      if (childUpdateOp?.type === 'update') {
        expect(childUpdateOp.updates.parentId).toBe('parent-task');
      }

      // Should update the parent to include the child in subTaskIds
      const parentUpdateOp = operations.find(
        (op) => op.type === 'update' && op.taskId === 'parent-task',
      );

      expect(parentUpdateOp).toBeDefined();
      if (parentUpdateOp?.type === 'update') {
        expect(parentUpdateOp.updates.subTaskIds).toContain('child-task');
      }
    });
  });

  describe('when cleaning up deleted task references', () => {
    it('should remove deleted tasks from parent subTaskIds', () => {
      // Existing SP tasks with parent-child relationship
      const spTasks: Task[] = [
        {
          id: 'parent-task',
          title: 'Parent Task',
          isDone: false,
          projectId: 'test-project',
          subTaskIds: ['child-1', 'child-2', 'child-3'],
        },
        {
          id: 'child-1',
          title: 'Child 1',
          isDone: false,
          projectId: 'test-project',
          parentId: 'parent-task',
        },
        {
          id: 'child-2',
          title: 'Child 2',
          isDone: false,
          projectId: 'test-project',
          parentId: 'parent-task',
        },
        {
          id: 'child-3',
          title: 'Child 3',
          isDone: false,
          projectId: 'test-project',
          parentId: 'parent-task',
        },
      ];

      // Markdown only shows parent and one child (others will be deleted)
      const mdTasks: ParsedTask[] = [
        {
          line: 0,
          indent: 0,
          completed: false,
          id: 'parent-task',
          title: 'Parent Task',
          originalLine: '- [ ] <!--parent-task--> Parent Task',
          parentId: null,
          isSubtask: false,
          depth: 0,
        },
        {
          line: 1,
          indent: 2,
          completed: false,
          id: 'child-1',
          title: 'Child 1',
          originalLine: '  - [ ] <!--child-1--> Child 1',
          parentId: 'parent-task',
          isSubtask: true,
          depth: 1,
        },
      ];

      const operations = generateTaskOperations(mdTasks, spTasks, 'test-project');

      // Should delete the missing children
      const deleteOps = operations.filter((op) => op.type === 'delete');
      expect(deleteOps).toHaveLength(2);
      expect(deleteOps.map((op) => op.taskId)).toContain('child-2');
      expect(deleteOps.map((op) => op.taskId)).toContain('child-3');

      // Should update parent to remove deleted children from subTaskIds
      const parentUpdateOp = operations.find(
        (op) => op.type === 'update' && op.taskId === 'parent-task',
      );

      expect(parentUpdateOp).toBeDefined();
      if (parentUpdateOp?.type === 'update') {
        expect(parentUpdateOp.updates.subTaskIds).toEqual(['child-1']);
        expect(parentUpdateOp.updates.subTaskIds).not.toContain('child-2');
        expect(parentUpdateOp.updates.subTaskIds).not.toContain('child-3');
      }
    });

    it('should create new update operation when parent has no existing updates', () => {
      // Parent task with subtasks that will be deleted
      const spTasks: Task[] = [
        {
          id: 'parent-task',
          title: 'Parent Task',
          isDone: false,
          projectId: 'test-project',
          subTaskIds: ['child-to-delete'],
        },
        {
          id: 'child-to-delete',
          title: 'Child to Delete',
          isDone: false,
          projectId: 'test-project',
          parentId: 'parent-task',
        },
      ];

      // Markdown shows only the parent (child will be deleted)
      const mdTasks: ParsedTask[] = [
        {
          line: 0,
          indent: 0,
          completed: false,
          id: 'parent-task',
          title: 'Parent Task',
          originalLine: '- [ ] <!--parent-task--> Parent Task',
          parentId: null,
          isSubtask: false,
          depth: 0,
        },
      ];

      const operations = generateTaskOperations(mdTasks, spTasks, 'test-project');

      // Should delete the child
      const deleteOps = operations.filter((op) => op.type === 'delete');
      expect(deleteOps).toHaveLength(1);
      expect(deleteOps[0].taskId).toBe('child-to-delete');

      // Should create update operation for parent to clear subTaskIds
      const parentUpdateOp = operations.find(
        (op) => op.type === 'update' && op.taskId === 'parent-task',
      );

      expect(parentUpdateOp).toBeDefined();
      if (parentUpdateOp?.type === 'update') {
        expect(parentUpdateOp.updates.subTaskIds).toEqual([]);
      }
    });

    it('should update existing operation when parent already has pending updates', () => {
      // Parent task that will get both a property update and subTaskIds cleanup
      const spTasks: Task[] = [
        {
          id: 'parent-task',
          title: 'Old Title',
          isDone: false,
          projectId: 'test-project',
          subTaskIds: ['child-to-delete'],
        },
        {
          id: 'child-to-delete',
          title: 'Child to Delete',
          isDone: false,
          projectId: 'test-project',
          parentId: 'parent-task',
        },
      ];

      // Markdown shows parent with new title but no children
      const mdTasks: ParsedTask[] = [
        {
          line: 0,
          indent: 0,
          completed: false,
          id: 'parent-task',
          title: 'New Title', // Changed title
          originalLine: '- [ ] <!--parent-task--> New Title',
          parentId: null,
          isSubtask: false,
          depth: 0,
        },
      ];

      const operations = generateTaskOperations(mdTasks, spTasks, 'test-project');

      // Should delete the child
      const deleteOps = operations.filter((op) => op.type === 'delete');
      expect(deleteOps).toHaveLength(1);
      expect(deleteOps[0].taskId).toBe('child-to-delete');

      // Should have one update operation with both title and subTaskIds
      const updateOps = operations.filter((op) => op.type === 'update');
      expect(updateOps).toHaveLength(1);

      const parentUpdateOp = updateOps[0];
      expect(parentUpdateOp.taskId).toBe('parent-task');
      if (parentUpdateOp.type === 'update') {
        expect(parentUpdateOp.updates.title).toBe('New Title');
        expect(parentUpdateOp.updates.subTaskIds).toEqual([]);
      }
    });
  });
});
