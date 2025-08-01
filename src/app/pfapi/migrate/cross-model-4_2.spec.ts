import { crossModelMigration4_2 } from './cross-model-4_2';
import { AppDataCompleteNew } from '../pfapi-config';

describe('crossModelMigration4_2', () => {
  it('should migrate lastTaskCreation timestamps to lastTaskCreationDay strings', () => {
    const testData: AppDataCompleteNew = {
      taskRepeatCfg: {
        ids: ['repeat1', 'repeat2', 'repeat3'],
        entities: {
          repeat1: {
            id: 'repeat1',
            lastTaskCreation: new Date('2025-08-01T23:59:59').getTime(),
            title: 'Late night task',
          },
          repeat2: {
            id: 'repeat2',
            lastTaskCreation: new Date('2025-01-01T00:00:00').getTime(),
            title: 'New year task',
          },
          repeat3: {
            id: 'repeat3',
            lastTaskCreation: 0, // Very old timestamp
            title: 'Ancient task',
          },
        },
      },
    } as any;

    const result = crossModelMigration4_2(testData) as AppDataCompleteNew;

    // Check that old field is removed and new field is added
    expect('lastTaskCreation' in result.taskRepeatCfg.entities.repeat1!).toBe(false);
    expect(result.taskRepeatCfg.entities.repeat1!.lastTaskCreationDay).toBe('2025-08-01');

    expect('lastTaskCreation' in result.taskRepeatCfg.entities.repeat2!).toBe(false);
    expect(result.taskRepeatCfg.entities.repeat2!.lastTaskCreationDay).toBe('2025-01-01');

    expect('lastTaskCreation' in result.taskRepeatCfg.entities.repeat3!).toBe(false);
    // Timestamp 0 is Jan 1, 1970 00:00 UTC, but in local time it may be Dec 31, 1969
    // depending on timezone. Check for both possibilities.
    const epochDate = result.taskRepeatCfg.entities.repeat3!.lastTaskCreationDay;
    expect(epochDate === '1970-01-01' || epochDate === '1969-12-31').toBe(true);
  });

  it('should handle entities that already have the new field', () => {
    const testData: AppDataCompleteNew = {
      taskRepeatCfg: {
        ids: ['repeat1'],
        entities: {
          repeat1: {
            id: 'repeat1',
            lastTaskCreationDay: '2025-08-01', // Already migrated
            title: 'Already migrated task',
          },
        },
      },
    } as any;

    const result = crossModelMigration4_2(testData) as AppDataCompleteNew;

    // Should remain unchanged
    expect(result.taskRepeatCfg.entities.repeat1!.lastTaskCreationDay).toBe('2025-08-01');
    expect('lastTaskCreation' in result.taskRepeatCfg.entities.repeat1!).toBe(false);
  });

  it('should handle empty entities gracefully', () => {
    const testData: AppDataCompleteNew = {
      taskRepeatCfg: {
        ids: [],
        entities: {},
      },
    } as any;

    expect(() => crossModelMigration4_2(testData)).not.toThrow();
  });

  it('should preserve all other fields during migration', () => {
    const testData: AppDataCompleteNew = {
      taskRepeatCfg: {
        ids: ['repeat1'],
        entities: {
          repeat1: {
            id: 'repeat1',
            lastTaskCreation: Date.now(),
            title: 'Test task',
            projectId: 'project123',
            repeatCycle: 'DAILY',
            repeatEvery: 1,
            startDate: '2025-01-01',
            tagIds: ['tag1', 'tag2'],
            isPaused: false,
          },
        },
      },
    } as any;

    const result = crossModelMigration4_2(testData) as AppDataCompleteNew;
    const migratedEntity = result.taskRepeatCfg.entities.repeat1!;

    // All fields except lastTaskCreation should be preserved
    expect(migratedEntity.title).toBe('Test task');
    expect(migratedEntity.projectId).toBe('project123');
    expect(migratedEntity.repeatCycle).toBe('DAILY');
    expect(migratedEntity.repeatEvery).toBe(1);
    expect(migratedEntity.startDate).toBe('2025-01-01');
    expect(migratedEntity.tagIds).toEqual(['tag1', 'tag2']);
    expect(migratedEntity.isPaused).toBe(false);
  });
});
