import { CrossModelMigrations } from '../api';
import { crossModelMigration2 } from './cross-model-2';
/* eslint-disable @typescript-eslint/naming-convention */

export const CROSS_MODEL_MIGRATIONS: CrossModelMigrations = {
  2: crossModelMigration2,
} as const;
