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
});
