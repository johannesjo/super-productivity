import { AppBaseData } from '../../imex/sync/sync.model';

/**
 * Configuration for entity models used in data repair.
 * This is a simplified version - the full config with reducerFn/migrateFn
 * was removed as part of the migration to the Operation Log system.
 */
export interface EntityModelKey {
  appDataKey: keyof AppBaseData;
}
