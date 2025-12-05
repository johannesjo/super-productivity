import { AppBaseData } from '../../imex/sync/sync.model';

/**
 * List of entity model keys used for data repair.
 * These correspond to the entity states that have ids/entities structure.
 *
 * Note: taskArchive is excluded as it's handled separately in the archive models.
 */
export const ALL_ENTITY_MODEL_KEYS: (keyof AppBaseData)[] = [
  'project',
  'issueProvider',
  'tag',
  'simpleCounter',
  'note',
  'metric',
  'task',
  'taskRepeatCfg',
];
