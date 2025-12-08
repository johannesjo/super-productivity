import {
  sortOperationsByDependency,
  DependencyExtractor,
} from './sort-operations-by-dependency.util';
import { Operation, OpType, EntityType } from '../operation.types';

describe('sortOperationsByDependency', () => {
  let opCounter = 0;

  const createTestOperation = (overrides: Partial<Operation> = {}): Operation => ({
    id: `op-${++opCounter}`,
    actionType: '[Task] Update',
    opType: OpType.Update,
    entityType: 'TASK' as EntityType,
    entityId: `entity-${opCounter}`,
    payload: { title: 'Test Task' },
    clientId: 'testClient',
    vectorClock: { testClient: 1 },
    timestamp: Date.now() + opCounter,
    schemaVersion: 1,
    ...overrides,
  });

  const noDepExtractor: DependencyExtractor = () => [];

  beforeEach(() => {
    opCounter = 0;
  });

  describe('edge cases', () => {
    it('should return empty array for empty input', () => {
      const result = sortOperationsByDependency([], noDepExtractor);

      expect(result).toEqual([]);
    });

    it('should return same array for single operation', () => {
      const op = createTestOperation();
      const result = sortOperationsByDependency([op], noDepExtractor);

      expect(result).toEqual([op]);
    });

    it('should return operations in original order when no dependencies', () => {
      const op1 = createTestOperation({ id: 'op-1', timestamp: 100 });
      const op2 = createTestOperation({ id: 'op-2', timestamp: 200 });
      const op3 = createTestOperation({ id: 'op-3', timestamp: 300 });

      const result = sortOperationsByDependency([op1, op2, op3], noDepExtractor);

      expect(result.map((o) => o.id)).toEqual(['op-1', 'op-2', 'op-3']);
    });
  });

  describe('hard dependencies (CREATE before dependent)', () => {
    it('should sort CREATE operations before operations that depend on them', () => {
      const createProjectOp = createTestOperation({
        id: 'create-project',
        opType: OpType.Create,
        entityType: 'PROJECT' as EntityType,
        entityId: 'project-1',
        timestamp: 200,
      });
      const createTaskOp = createTestOperation({
        id: 'create-task',
        opType: OpType.Create,
        entityType: 'TASK' as EntityType,
        entityId: 'task-1',
        timestamp: 100,
      });

      const extractor: DependencyExtractor = (op) => {
        if (op.id === 'create-task') {
          return [
            {
              entityType: 'PROJECT' as EntityType,
              entityId: 'project-1',
              mustExist: true,
              relation: 'parent',
            },
          ];
        }
        return [];
      };

      // Task comes first in input but depends on project
      const result = sortOperationsByDependency(
        [createTaskOp, createProjectOp],
        extractor,
      );

      expect(result.map((o) => o.id)).toEqual(['create-project', 'create-task']);
    });

    it('should handle chain of dependencies', () => {
      const opA = createTestOperation({
        id: 'op-a',
        opType: OpType.Create,
        entityId: 'entity-a',
        timestamp: 300,
      });
      const opB = createTestOperation({
        id: 'op-b',
        opType: OpType.Create,
        entityId: 'entity-b',
        timestamp: 200,
      });
      const opC = createTestOperation({
        id: 'op-c',
        opType: OpType.Create,
        entityId: 'entity-c',
        timestamp: 100,
      });

      // C depends on B, B depends on A
      const extractor: DependencyExtractor = (op) => {
        if (op.id === 'op-c') {
          return [
            {
              entityType: 'TASK' as EntityType,
              entityId: 'entity-b',
              mustExist: true,
              relation: 'parent',
            },
          ];
        }
        if (op.id === 'op-b') {
          return [
            {
              entityType: 'TASK' as EntityType,
              entityId: 'entity-a',
              mustExist: true,
              relation: 'parent',
            },
          ];
        }
        return [];
      };

      // Input in reverse order
      const result = sortOperationsByDependency([opC, opB, opA], extractor);

      expect(result.map((o) => o.id)).toEqual(['op-a', 'op-b', 'op-c']);
    });
  });

  describe('DELETE ordering', () => {
    it('should sort DELETE operations after operations that reference the deleted entity', () => {
      const deleteTaskOp = createTestOperation({
        id: 'delete-task',
        opType: OpType.Delete,
        entityType: 'TASK' as EntityType,
        entityId: 'task-1',
        timestamp: 100,
      });
      const updateTagOp = createTestOperation({
        id: 'update-tag',
        opType: OpType.Update,
        entityType: 'TAG' as EntityType,
        entityId: 'tag-1',
        timestamp: 200,
      });

      // Tag update references the task that will be deleted
      const extractor: DependencyExtractor = (op) => {
        if (op.id === 'update-tag') {
          return [
            {
              entityType: 'TASK' as EntityType,
              entityId: 'task-1',
              mustExist: false,
              relation: 'reference',
            },
          ];
        }
        return [];
      };

      // Delete comes first in input
      const result = sortOperationsByDependency([deleteTaskOp, updateTagOp], extractor);

      expect(result.map((o) => o.id)).toEqual(['update-tag', 'delete-task']);
    });

    it('should handle multiple operations referencing a deleted entity', () => {
      const deleteTaskOp = createTestOperation({
        id: 'delete-task',
        opType: OpType.Delete,
        entityType: 'TASK' as EntityType,
        entityId: 'task-1',
        timestamp: 100,
      });
      const updateTag1Op = createTestOperation({
        id: 'update-tag-1',
        opType: OpType.Update,
        entityType: 'TAG' as EntityType,
        entityId: 'tag-1',
        timestamp: 200,
      });
      const updateTag2Op = createTestOperation({
        id: 'update-tag-2',
        opType: OpType.Update,
        entityType: 'TAG' as EntityType,
        entityId: 'tag-2',
        timestamp: 300,
      });

      const extractor: DependencyExtractor = (op) => {
        if (op.id === 'update-tag-1' || op.id === 'update-tag-2') {
          return [
            {
              entityType: 'TASK' as EntityType,
              entityId: 'task-1',
              mustExist: false,
              relation: 'reference',
            },
          ];
        }
        return [];
      };

      const result = sortOperationsByDependency(
        [deleteTaskOp, updateTag1Op, updateTag2Op],
        extractor,
      );

      // Delete should come last
      expect(result[result.length - 1].id).toBe('delete-task');
      // Both tag updates should come before delete
      expect(result.slice(0, 2).map((o) => o.id)).toContain('update-tag-1');
      expect(result.slice(0, 2).map((o) => o.id)).toContain('update-tag-2');
    });
  });

  describe('soft dependencies (tie-breaking)', () => {
    it('should prefer operations with soft dependents first', () => {
      const op1 = createTestOperation({
        id: 'op-1',
        opType: OpType.Create,
        entityId: 'entity-1',
        timestamp: 100,
      });
      const op2 = createTestOperation({
        id: 'op-2',
        opType: OpType.Create,
        entityId: 'entity-2',
        timestamp: 100,
      });
      const op3 = createTestOperation({
        id: 'op-3',
        opType: OpType.Update,
        entityId: 'entity-3',
        timestamp: 100,
      });

      // op3 soft-depends on op1 (not a hard dependency)
      const extractor: DependencyExtractor = (op) => {
        if (op.id === 'op-3') {
          return [
            {
              entityType: 'TASK' as EntityType,
              entityId: 'entity-1',
              mustExist: false,
              relation: 'reference',
            },
          ];
        }
        return [];
      };

      const result = sortOperationsByDependency([op2, op1, op3], extractor);

      // op1 should come before op2 because it has soft dependents
      const op1Index = result.findIndex((o) => o.id === 'op-1');
      const op2Index = result.findIndex((o) => o.id === 'op-2');
      expect(op1Index).toBeLessThan(op2Index);
    });
  });

  describe('CREATE priority', () => {
    it('should prioritize CREATE operations over UPDATE/DELETE when no dependencies', () => {
      const updateOp = createTestOperation({
        id: 'update-op',
        opType: OpType.Update,
        entityId: 'entity-1',
        timestamp: 100,
      });
      const createOp = createTestOperation({
        id: 'create-op',
        opType: OpType.Create,
        entityId: 'entity-2',
        timestamp: 200,
      });
      const deleteOp = createTestOperation({
        id: 'delete-op',
        opType: OpType.Delete,
        entityId: 'entity-3',
        timestamp: 150,
      });

      const result = sortOperationsByDependency(
        [updateOp, deleteOp, createOp],
        noDepExtractor,
      );

      // CREATE should come first
      expect(result[0].id).toBe('create-op');
    });
  });

  describe('cycle handling', () => {
    it('should handle cycles by adding remaining ops at end', () => {
      const opA = createTestOperation({
        id: 'op-a',
        opType: OpType.Create,
        entityId: 'entity-a',
      });
      const opB = createTestOperation({
        id: 'op-b',
        opType: OpType.Create,
        entityId: 'entity-b',
      });

      // Circular: A depends on B, B depends on A (shouldn't happen but handle gracefully)
      const extractor: DependencyExtractor = (op) => {
        if (op.id === 'op-a') {
          return [
            {
              entityType: 'TASK' as EntityType,
              entityId: 'entity-b',
              mustExist: true,
              relation: 'parent',
            },
          ];
        }
        if (op.id === 'op-b') {
          return [
            {
              entityType: 'TASK' as EntityType,
              entityId: 'entity-a',
              mustExist: true,
              relation: 'parent',
            },
          ];
        }
        return [];
      };

      const result = sortOperationsByDependency([opA, opB], extractor);

      // Should return both operations (fallback behavior)
      expect(result.length).toBe(2);
      expect(result.map((o) => o.id)).toContain('op-a');
      expect(result.map((o) => o.id)).toContain('op-b');
    });
  });

  describe('timestamp tie-breaking', () => {
    it('should use earlier timestamp as final tie-breaker', () => {
      const op1 = createTestOperation({
        id: 'op-1',
        opType: OpType.Update,
        entityId: 'entity-1',
        timestamp: 300,
      });
      const op2 = createTestOperation({
        id: 'op-2',
        opType: OpType.Update,
        entityId: 'entity-2',
        timestamp: 100,
      });
      const op3 = createTestOperation({
        id: 'op-3',
        opType: OpType.Update,
        entityId: 'entity-3',
        timestamp: 200,
      });

      const result = sortOperationsByDependency([op1, op2, op3], noDepExtractor);

      // All UPDATE ops with no deps, should be sorted by timestamp
      expect(result.map((o) => o.id)).toEqual(['op-2', 'op-3', 'op-1']);
    });
  });

  describe('mixed scenarios', () => {
    it('should handle complex scenario with multiple constraints', () => {
      // Scenario: Create project, create task in project, delete another task, update tag
      const createProject = createTestOperation({
        id: 'create-project',
        opType: OpType.Create,
        entityType: 'PROJECT' as EntityType,
        entityId: 'project-1',
        timestamp: 100,
      });
      const createTask = createTestOperation({
        id: 'create-task',
        opType: OpType.Create,
        entityType: 'TASK' as EntityType,
        entityId: 'task-1',
        timestamp: 200,
      });
      const deleteTask = createTestOperation({
        id: 'delete-task',
        opType: OpType.Delete,
        entityType: 'TASK' as EntityType,
        entityId: 'task-2',
        timestamp: 150,
      });
      const updateTag = createTestOperation({
        id: 'update-tag',
        opType: OpType.Update,
        entityType: 'TAG' as EntityType,
        entityId: 'tag-1',
        timestamp: 175,
      });

      const extractor: DependencyExtractor = (op) => {
        if (op.id === 'create-task') {
          // Task depends on project (hard)
          return [
            {
              entityType: 'PROJECT' as EntityType,
              entityId: 'project-1',
              mustExist: true,
              relation: 'parent',
            },
          ];
        }
        if (op.id === 'update-tag') {
          // Tag references the task being deleted (soft)
          return [
            {
              entityType: 'TASK' as EntityType,
              entityId: 'task-2',
              mustExist: false,
              relation: 'reference',
            },
          ];
        }
        return [];
      };

      // Scrambled input order
      const result = sortOperationsByDependency(
        [deleteTask, updateTag, createTask, createProject],
        extractor,
      );

      // Verify constraints:
      // 1. create-project before create-task (hard dep)
      const projectIdx = result.findIndex((o) => o.id === 'create-project');
      const taskIdx = result.findIndex((o) => o.id === 'create-task');
      expect(projectIdx).toBeLessThan(taskIdx);

      // 2. update-tag before delete-task (DELETE ordering)
      const tagIdx = result.findIndex((o) => o.id === 'update-tag');
      const deleteIdx = result.findIndex((o) => o.id === 'delete-task');
      expect(tagIdx).toBeLessThan(deleteIdx);
    });
  });
});
