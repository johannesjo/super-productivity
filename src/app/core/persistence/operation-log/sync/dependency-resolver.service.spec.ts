import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { DependencyResolverService } from './dependency-resolver.service';
import { Operation, OpType, EntityType } from '../operation.types';
import { selectTaskEntities } from '../../../../features/tasks/store/task.selectors';
import { selectProjectFeatureState } from '../../../../features/project/store/project.reducer';

describe('DependencyResolverService', () => {
  let service: DependencyResolverService;
  let store: MockStore;

  const createTestOperation = (overrides: Partial<Operation> = {}): Operation => ({
    id: 'opId123',
    actionType: '[Task] Update',
    opType: OpType.Update,
    entityType: 'TASK' as EntityType,
    entityId: 'task1',
    payload: {},
    clientId: 'testClient',
    vectorClock: { testClient: 1 },
    timestamp: Date.now(),
    schemaVersion: 1,
    ...overrides,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DependencyResolverService, provideMockStore()],
    });
    service = TestBed.inject(DependencyResolverService);
    store = TestBed.inject(MockStore);
  });

  afterEach(() => {
    store.resetSelectors();
  });

  describe('extractDependencies', () => {
    it('should return empty array for operation without dependencies', () => {
      const op = createTestOperation({
        entityType: 'TASK' as EntityType,
        payload: { title: 'Simple task' },
      });
      const deps = service.extractDependencies(op);
      expect(deps).toEqual([]);
    });

    it('should extract projectId as soft reference dependency', () => {
      const op = createTestOperation({
        entityType: 'TASK' as EntityType,
        payload: { projectId: 'proj1', title: 'Task with project' },
      });
      const deps = service.extractDependencies(op);
      expect(deps.length).toBe(1);
      expect(deps[0]).toEqual({
        entityType: 'PROJECT',
        entityId: 'proj1',
        mustExist: false,
        relation: 'reference',
      });
    });

    it('should extract parentId as hard parent dependency', () => {
      const op = createTestOperation({
        entityType: 'TASK' as EntityType,
        payload: { parentId: 'parentTask1', title: 'Subtask' },
      });
      const deps = service.extractDependencies(op);
      expect(deps.length).toBe(1);
      expect(deps[0]).toEqual({
        entityType: 'TASK',
        entityId: 'parentTask1',
        mustExist: true,
        relation: 'parent',
      });
    });

    it('should extract both projectId and parentId', () => {
      const op = createTestOperation({
        entityType: 'TASK' as EntityType,
        payload: { projectId: 'proj1', parentId: 'parentTask1' },
      });
      const deps = service.extractDependencies(op);
      expect(deps.length).toBe(2);
      expect(deps.find((d) => d.entityType === 'PROJECT')).toBeTruthy();
      expect(deps.find((d) => d.entityId === 'parentTask1')).toBeTruthy();
    });

    it('should return empty array for non-TASK entities without dependencies', () => {
      const op = createTestOperation({
        entityType: 'PROJECT' as EntityType,
        payload: { someField: 'value' },
      });
      const deps = service.extractDependencies(op);
      expect(deps).toEqual([]);
    });

    it('should extract taskIds from TAG operations as soft dependencies', () => {
      const op = createTestOperation({
        entityType: 'TAG' as EntityType,
        entityId: 'tag1',
        payload: { taskIds: ['task1', 'task2', 'task3'] },
      });
      const deps = service.extractDependencies(op);
      expect(deps.length).toBe(3);
      expect(deps).toEqual([
        {
          entityType: 'TASK',
          entityId: 'task1',
          mustExist: false,
          relation: 'reference',
        },
        {
          entityType: 'TASK',
          entityId: 'task2',
          mustExist: false,
          relation: 'reference',
        },
        {
          entityType: 'TASK',
          entityId: 'task3',
          mustExist: false,
          relation: 'reference',
        },
      ]);
    });

    it('should extract taskIds from nested TAG update operations (updateTag action)', () => {
      // updateTag action has structure: { tag: { id, changes: { taskIds } } }
      const op = createTestOperation({
        entityType: 'TAG' as EntityType,
        entityId: 'today-tag',
        opType: OpType.Update,
        payload: {
          tag: {
            id: 'today-tag',
            changes: {
              taskIds: ['task1', 'task2'],
            },
          },
        },
      });
      const deps = service.extractDependencies(op);
      expect(deps.length).toBe(2);
      expect(deps).toEqual([
        {
          entityType: 'TASK',
          entityId: 'task1',
          mustExist: false,
          relation: 'reference',
        },
        {
          entityType: 'TASK',
          entityId: 'task2',
          mustExist: false,
          relation: 'reference',
        },
      ]);
    });

    it('should return empty array for TAG operations without taskIds', () => {
      const op = createTestOperation({
        entityType: 'TAG' as EntityType,
        entityId: 'tag1',
        payload: { title: 'My Tag', color: 'blue' },
      });
      const deps = service.extractDependencies(op);
      expect(deps).toEqual([]);
    });

    it('should extract projectId from NOTE operations as soft dependency', () => {
      const op = createTestOperation({
        entityType: 'NOTE' as EntityType,
        entityId: 'note1',
        payload: { projectId: 'proj1', content: 'My note' },
      });
      const deps = service.extractDependencies(op);
      expect(deps.length).toBe(1);
      expect(deps[0]).toEqual({
        entityType: 'PROJECT',
        entityId: 'proj1',
        mustExist: false,
        relation: 'reference',
      });
    });

    it('should return empty array for NOTE operations without projectId', () => {
      const op = createTestOperation({
        entityType: 'NOTE' as EntityType,
        entityId: 'note1',
        payload: { content: 'Note without project' },
      });
      const deps = service.extractDependencies(op);
      expect(deps).toEqual([]);
    });

    it('should extract subTaskIds from TASK operations as soft dependencies', () => {
      const op = createTestOperation({
        entityType: 'TASK' as EntityType,
        entityId: 'parentTask',
        payload: { subTaskIds: ['sub1', 'sub2'] },
      });
      const deps = service.extractDependencies(op);
      expect(deps.length).toBe(2);
      expect(deps).toEqual([
        {
          entityType: 'TASK',
          entityId: 'sub1',
          mustExist: false,
          relation: 'reference',
        },
        {
          entityType: 'TASK',
          entityId: 'sub2',
          mustExist: false,
          relation: 'reference',
        },
      ]);
    });
  });

  describe('checkDependencies', () => {
    it('should return empty missing array when all dependencies exist', async () => {
      // Mock entity dictionaries with the entities that should exist
      store.overrideSelector(selectTaskEntities, {
        parentTask1: { id: 'parentTask1' },
      } as any);
      store.overrideSelector(selectProjectFeatureState, {
        ids: ['proj1'],
        entities: { proj1: { id: 'proj1' } },
      } as any);

      const deps = [
        {
          entityType: 'TASK' as EntityType,
          entityId: 'parentTask1',
          mustExist: true,
          relation: 'parent' as const,
        },
        {
          entityType: 'PROJECT' as EntityType,
          entityId: 'proj1',
          mustExist: false,
          relation: 'reference' as const,
        },
      ];

      const result = await service.checkDependencies(deps);
      expect(result.missing).toEqual([]);
    });

    it('should return missing task dependency', async () => {
      // Mock empty task entities dictionary
      store.overrideSelector(selectTaskEntities, {} as any);

      const deps = [
        {
          entityType: 'TASK' as EntityType,
          entityId: 'missingTask',
          mustExist: true,
          relation: 'parent' as const,
        },
      ];

      const result = await service.checkDependencies(deps);
      expect(result.missing.length).toBe(1);
      expect(result.missing[0].entityId).toBe('missingTask');
    });

    it('should return missing project dependency', async () => {
      // Mock empty project state
      store.overrideSelector(selectProjectFeatureState, {
        ids: [],
        entities: {},
      } as any);

      const deps = [
        {
          entityType: 'PROJECT' as EntityType,
          entityId: 'missingProj',
          mustExist: false,
          relation: 'reference' as const,
        },
      ];

      const result = await service.checkDependencies(deps);
      expect(result.missing.length).toBe(1);
      expect(result.missing[0].entityId).toBe('missingProj');
    });

    it('should assume unknown entity types exist', async () => {
      const deps = [
        {
          // Use an unknown entity type that's not in the switch case
          // to test the default case which returns true
          entityType: 'UNKNOWN_FUTURE_TYPE' as EntityType,
          entityId: 'some-id',
          mustExist: false,
          relation: 'reference' as const,
        },
      ];

      const result = await service.checkDependencies(deps);
      expect(result.missing).toEqual([]);
    });

    it('should handle empty dependency array', async () => {
      const result = await service.checkDependencies([]);
      expect(result.missing).toEqual([]);
    });
  });
});
