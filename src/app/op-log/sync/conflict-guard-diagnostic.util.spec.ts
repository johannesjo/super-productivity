import { MAX_DATA_LENGTH } from '../../core/log';
import { ActionType, ENTITY_TYPES } from '../core/operation.types';
import {
  buildConflictGuardDiagnostic,
  SYNC_MULTI_ENTITY_UNSUPPORTED_CODE,
} from './conflict-guard-diagnostic.util';

describe('buildConflictGuardDiagnostic', () => {
  it('builds a bounded display message without the conflicting entity id', () => {
    const actionTypes = [
      ActionType.TASK_SHARED_UPDATE_MULTIPLE,
      ActionType.TASK_SHARED_MOVE_IN_TODAY,
    ].sort();
    const diagnostic = buildConflictGuardDiagnostic({
      side: 'local',
      operations: [
        {
          actionType: ActionType.TASK_SHARED_UPDATE_MULTIPLE,
          entityId: 'task-1',
          entityIds: ['task-1', 'task-2'],
        },
        {
          actionType: ActionType.TASK_SHARED_MOVE_IN_TODAY,
          entityId: 'task-2',
          entityIds: ['task-2', 'task-3'],
        },
      ],
      entityType: 'TASK',
      entityId: 'rpt_cfg-1_2026-07-31',
    });

    expect(diagnostic.logMetadata).toEqual({
      code: SYNC_MULTI_ENTITY_UNSUPPORTED_CODE,
      side: 'local',
      actionTypes,
      entityType: 'TASK',
      entityCount: 3,
      entityId: 'rpt_cfg-1_2026-07-31',
    });
    expect(diagnostic.message).toBe(
      `${SYNC_MULTI_ENTITY_UNSUPPORTED_CODE} side=local ` +
        `actionTypes=${actionTypes.join('|')} entityType=TASK entityCount=3`,
    );
    expect(diagnostic.message).not.toContain('rpt_cfg-1_2026-07-31');
  });

  it('deduplicates and sorts action types before limiting them to three', () => {
    const rawActionTypes = [
      ActionType.WORK_CONTEXT_MOVE,
      ActionType.TASK_SHARED_UPDATE_MULTIPLE,
      ActionType.PROJECT_UPDATE,
      ActionType.TAG_UPDATE,
      ActionType.NOTE_UPDATE,
      ActionType.PROJECT_UPDATE,
    ];
    const sortedActionTypes = [...new Set(rawActionTypes)].sort();
    const diagnostic = buildConflictGuardDiagnostic({
      side: 'remote',
      operations: rawActionTypes.map((actionType, index) => ({
        actionType,
        entityId: `task-${index}`,
      })),
      entityType: 'TASK',
      entityId: 'task-1',
    });

    expect(diagnostic.logMetadata.actionTypes).toEqual([
      ...sortedActionTypes.slice(0, 3),
      `+${sortedActionTypes.length - 3}`,
    ]);
  });

  it('maps hostile metadata to UNKNOWN without echoing it', () => {
    const html = '<img src=x onerror=alert(1)>';
    const controlCharacters = 'bad\n\u0000action';
    const diagnostic = buildConflictGuardDiagnostic({
      side: 'remote',
      operations: [
        { actionType: html, entityIds: ['task-1', 'task-1'] },
        { actionType: controlCharacters, entityId: 'task-2' },
      ],
      entityType: html,
      entityId: `safe-prefix-${html}`,
    });

    expect(diagnostic.logMetadata).toEqual({
      code: SYNC_MULTI_ENTITY_UNSUPPORTED_CODE,
      side: 'remote',
      actionTypes: ['UNKNOWN'],
      entityType: 'UNKNOWN',
      entityCount: 2,
      entityId: 'UNKNOWN',
    });
    expect(JSON.stringify(diagnostic)).not.toContain(html);
    expect(JSON.stringify(diagnostic)).not.toContain(controlCharacters);
  });

  it('validates the complete entity id before truncating a valid one to 64 characters', () => {
    const validLongId = 'a'.repeat(80);
    const validDiagnostic = buildConflictGuardDiagnostic({
      side: 'local',
      operations: [
        {
          actionType: ActionType.TASK_SHARED_UPDATE_MULTIPLE,
          entityIds: ['task-1', 'task-2'],
        },
      ],
      entityType: 'TASK',
      entityId: validLongId,
    });
    const invalidDiagnostic = buildConflictGuardDiagnostic({
      side: 'local',
      operations: [
        {
          actionType: ActionType.TASK_SHARED_UPDATE_MULTIPLE,
          entityIds: ['task-1', 'task-2'],
        },
      ],
      entityType: 'TASK',
      entityId: `${'a'.repeat(80)}<`,
    });

    expect(validDiagnostic.logMetadata.entityId).toBe('a'.repeat(64));
    expect(invalidDiagnostic.logMetadata.entityId).toBe('UNKNOWN');
  });

  it('marks malformed entity references unknown and clamps oversized counts', () => {
    const malformed = buildConflictGuardDiagnostic({
      side: 'local',
      operations: [
        {
          actionType: ActionType.TASK_SHARED_UPDATE_MULTIPLE,
          entityIds: 'not-an-array',
        },
      ],
      entityType: 'TASK',
      entityId: 'task-1',
    });
    const oversized = buildConflictGuardDiagnostic({
      side: 'local',
      operations: Array.from({ length: 1_000 }, (_, index) => ({
        actionType: ActionType.TASK_SHARED_UPDATE_MULTIPLE,
        entityId: `task-${index}`,
      })),
      entityType: 'TASK',
      entityId: 'task-1',
    });

    expect(malformed.logMetadata.entityCount).toBe('UNKNOWN');
    expect(oversized.logMetadata.entityCount).toBe('999+');
    expect(oversized.message).toContain('entityCount=999+');
  });

  it('fits maximum allowlisted metadata in the exported-log serialization cap', () => {
    const longestEntityType = [...ENTITY_TYPES].sort((a, b) => b.length - a.length)[0];
    const operations = Object.values(ActionType).map((actionType, index) => ({
      actionType,
      entityId: `entity-${index}`,
    }));
    operations.push(
      ...Array.from({ length: 1_000 - operations.length }, (_, index) => ({
        actionType: ActionType.TASK_SHARED_UPDATE_MULTIPLE,
        entityId: `extra-${index}`,
      })),
    );

    const diagnostic = buildConflictGuardDiagnostic({
      side: 'remote',
      operations,
      entityType: longestEntityType,
      entityId: 'i'.repeat(64),
    });

    expect(diagnostic.logMetadata.entityCount).toBe('999+');
    expect(diagnostic.logMetadata.actionTypes.length).toBe(4);
    expect(JSON.stringify(diagnostic.logMetadata).length).toBeLessThanOrEqual(
      MAX_DATA_LENGTH,
    );
  });
});
