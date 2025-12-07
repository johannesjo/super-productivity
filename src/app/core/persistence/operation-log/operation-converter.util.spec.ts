import { convertOpToAction, ACTION_TYPE_ALIASES } from './operation-converter.util';
import { Operation, OpType } from './operation.types';

describe('operation-converter utility', () => {
  const createMockOperation = (overrides: Partial<Operation> = {}): Operation => ({
    id: 'op-123',
    actionType: '[Task] Update Task',
    opType: OpType.Update,
    entityType: 'TASK',
    entityId: 'task-456',
    payload: { title: 'Test Task', done: false },
    clientId: 'testClient',
    vectorClock: { testClient: 5 },
    timestamp: Date.now(),
    schemaVersion: 1,
    ...overrides,
  });

  describe('convertOpToAction', () => {
    it('should convert operation to action with correct type', () => {
      const op = createMockOperation({ actionType: '[Task] Add Task' });
      const action = convertOpToAction(op);

      expect(action.type).toBe('[Task] Add Task');
    });

    it('should spread payload properties into action', () => {
      const op = createMockOperation({
        payload: { title: 'My Task', timeSpent: 3600, done: true },
      });
      const action = convertOpToAction(op);

      expect((action as any).title).toBe('My Task');
      expect((action as any).timeSpent).toBe(3600);
      expect((action as any).done).toBe(true);
    });

    it('should include meta with isPersistent true', () => {
      const op = createMockOperation();
      const action = convertOpToAction(op);

      expect(action.meta.isPersistent).toBe(true);
    });

    it('should include meta with isRemote true', () => {
      const op = createMockOperation();
      const action = convertOpToAction(op);

      expect(action.meta.isRemote).toBe(true);
    });

    it('should include entityType in meta', () => {
      const op = createMockOperation({ entityType: 'PROJECT' });
      const action = convertOpToAction(op);

      expect(action.meta.entityType).toBe('PROJECT');
    });

    it('should include entityId in meta', () => {
      const op = createMockOperation({ entityId: 'entity-789' });
      const action = convertOpToAction(op);

      expect(action.meta.entityId).toBe('entity-789');
    });

    it('should include entityIds in meta for batch operations', () => {
      const op = createMockOperation({
        opType: OpType.Batch,
        entityIds: ['task-1', 'task-2', 'task-3'],
      });
      const action = convertOpToAction(op);

      expect(action.meta.entityIds).toEqual(['task-1', 'task-2', 'task-3']);
    });

    it('should include opType in meta', () => {
      const op = createMockOperation({ opType: OpType.Create });
      const action = convertOpToAction(op);

      expect(action.meta.opType).toBe(OpType.Create);
    });

    it('should handle Create operation', () => {
      const op = createMockOperation({
        opType: OpType.Create,
        actionType: '[Task] Add Task',
        payload: { id: 'new-task', title: 'New Task' },
      });
      const action = convertOpToAction(op);

      expect(action.type).toBe('[Task] Add Task');
      expect(action.meta.opType).toBe(OpType.Create);
      expect((action as any).id).toBe('new-task');
    });

    it('should handle Update operation', () => {
      const op = createMockOperation({
        opType: OpType.Update,
        actionType: '[Task] Update Task',
        payload: { id: 'task-1', changes: { title: 'Updated' } },
      });
      const action = convertOpToAction(op);

      expect(action.type).toBe('[Task] Update Task');
      expect(action.meta.opType).toBe(OpType.Update);
      expect((action as any).changes.title).toBe('Updated');
    });

    it('should handle Delete operation', () => {
      const op = createMockOperation({
        opType: OpType.Delete,
        actionType: '[Task] Delete Task',
        entityId: 'task-to-delete',
        payload: { id: 'task-to-delete' },
      });
      const action = convertOpToAction(op);

      expect(action.type).toBe('[Task] Delete Task');
      expect(action.meta.opType).toBe(OpType.Delete);
    });

    it('should handle Move operation', () => {
      const op = createMockOperation({
        opType: OpType.Move,
        actionType: '[Task] Move Task',
        payload: { taskId: 'task-1', newProjectId: 'project-2' },
      });
      const action = convertOpToAction(op);

      expect(action.type).toBe('[Task] Move Task');
      expect(action.meta.opType).toBe(OpType.Move);
    });

    it('should handle Batch operation', () => {
      const op = createMockOperation({
        opType: OpType.Batch,
        actionType: '[Task] Batch Update',
        entityIds: ['t1', 't2', 't3'],
        payload: { ids: ['t1', 't2', 't3'], changes: { done: true } },
      });
      const action = convertOpToAction(op);

      expect(action.type).toBe('[Task] Batch Update');
      expect(action.meta.opType).toBe(OpType.Batch);
    });

    it('should handle SyncImport operation', () => {
      const op = createMockOperation({
        opType: OpType.SyncImport,
        entityType: 'ALL',
        actionType: '[Sync] Import State',
        payload: { fullState: {} },
      });
      const action = convertOpToAction(op);

      expect(action.meta.opType).toBe(OpType.SyncImport);
      expect(action.meta.entityType).toBe('ALL');
    });

    it('should handle BackupImport operation', () => {
      const op = createMockOperation({
        opType: OpType.BackupImport,
        entityType: 'ALL',
        actionType: '[Backup] Restore',
        payload: { backupData: {} },
      });
      const action = convertOpToAction(op);

      expect(action.meta.opType).toBe(OpType.BackupImport);
    });

    it('should handle Repair operation', () => {
      const op = createMockOperation({
        opType: OpType.Repair,
        entityType: 'ALL',
        actionType: '[Repair] Apply Repair',
        payload: { appDataComplete: {}, repairSummary: {} },
      });
      const action = convertOpToAction(op);

      expect(action.meta.opType).toBe(OpType.Repair);
    });

    it('should handle empty payload', () => {
      const op = createMockOperation({ payload: {} });
      const action = convertOpToAction(op);

      expect(action.type).toBeDefined();
      expect(action.meta).toBeDefined();
    });

    it('should handle complex nested payload', () => {
      const op = createMockOperation({
        payload: {
          task: {
            id: 't1',
            subTasks: [{ id: 'st1', title: 'Subtask' }],
            timeTracking: { totalTime: 3600, entries: [] },
          },
        },
      });
      const action = convertOpToAction(op);

      expect((action as any).task.id).toBe('t1');
      expect((action as any).task.subTasks[0].title).toBe('Subtask');
    });

    it('should handle undefined entityId', () => {
      const op = createMockOperation({ entityId: undefined });
      const action = convertOpToAction(op);

      expect(action.meta.entityId).toBeUndefined();
    });

    it('should handle undefined entityIds', () => {
      const op = createMockOperation({ entityIds: undefined });
      const action = convertOpToAction(op);

      expect(action.meta.entityIds).toBeUndefined();
    });

    it('should preserve all entity types', () => {
      const entityTypes = [
        'TASK',
        'PROJECT',
        'TAG',
        'NOTE',
        'GLOBAL_CONFIG',
        'SIMPLE_COUNTER',
        'WORK_CONTEXT',
        'TASK_REPEAT_CFG',
        'ISSUE_PROVIDER',
        'PLANNER',
        'MENU_TREE',
        'METRIC',
        'MIGRATION',
        'RECOVERY',
        'ALL',
      ] as const;

      for (const entityType of entityTypes) {
        const op = createMockOperation({ entityType });
        const action = convertOpToAction(op);

        expect(action.meta.entityType).toBe(entityType);
      }
    });

    it('should use current action type when no alias exists', () => {
      const op = createMockOperation({ actionType: '[Task] Some Action' });
      const action = convertOpToAction(op);

      expect(action.type).toBe('[Task] Some Action');
    });

    it('should resolve aliased action types to current names', () => {
      // Temporarily add an alias for testing
      const originalAliases = { ...ACTION_TYPE_ALIASES };
      (ACTION_TYPE_ALIASES as Record<string, string>)['[Old] Legacy Action'] =
        '[New] Current Action';

      try {
        const op = createMockOperation({ actionType: '[Old] Legacy Action' });
        const action = convertOpToAction(op);

        expect(action.type).toBe('[New] Current Action');
      } finally {
        // Restore original aliases
        Object.keys(ACTION_TYPE_ALIASES).forEach((key) => {
          if (!(key in originalAliases)) {
            delete (ACTION_TYPE_ALIASES as Record<string, string>)[key];
          }
        });
      }
    });

    describe('multi-entity payload handling', () => {
      it('should extract actionPayload from MultiEntityPayload', () => {
        const op = createMockOperation({
          payload: {
            actionPayload: { taskId: 'task-1', title: 'Test Task' },
            entityChanges: [
              {
                entityType: 'TASK',
                entityId: 'task-1',
                opType: OpType.Update,
                changes: { title: 'Test Task' },
              },
              {
                entityType: 'TAG',
                entityId: 'tag-1',
                opType: OpType.Update,
                changes: { taskIds: ['task-1'] },
              },
            ],
          },
        });
        const action = convertOpToAction(op);

        expect((action as any).taskId).toBe('task-1');
        expect((action as any).title).toBe('Test Task');
        // entityChanges should NOT be spread into the action
        expect((action as any).entityChanges).toBeUndefined();
      });

      it('should handle MultiEntityPayload with empty entityChanges', () => {
        const op = createMockOperation({
          payload: {
            actionPayload: { id: 'task-1' },
            entityChanges: [],
          },
        });
        const action = convertOpToAction(op);

        expect((action as any).id).toBe('task-1');
      });

      it('should fall back to legacy payload format when not MultiEntityPayload', () => {
        const op = createMockOperation({
          payload: { directProperty: 'value', nested: { prop: 123 } },
        });
        const action = convertOpToAction(op);

        expect((action as any).directProperty).toBe('value');
        expect((action as any).nested.prop).toBe(123);
      });

      it('should handle complex MultiEntityPayload with nested actionPayload', () => {
        const op = createMockOperation({
          payload: {
            actionPayload: {
              task: { id: 't1', title: 'Parent', subTaskIds: ['st1'] },
              subTasks: [{ id: 'st1', title: 'Child' }],
            },
            entityChanges: [
              {
                entityType: 'TASK',
                entityId: 't1',
                opType: OpType.Create,
                changes: { id: 't1' },
              },
              {
                entityType: 'TASK',
                entityId: 'st1',
                opType: OpType.Create,
                changes: { id: 'st1' },
              },
              {
                entityType: 'PROJECT',
                entityId: 'p1',
                opType: OpType.Update,
                changes: { taskIds: ['t1'] },
              },
            ],
          },
        });
        const action = convertOpToAction(op);

        expect((action as any).task.id).toBe('t1');
        expect((action as any).subTasks[0].id).toBe('st1');
      });
    });
  });
});
