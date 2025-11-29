import { CrossModelMigrations } from '../api';
import { crossModelMigration2 } from './cross-model-2';
import { crossModelMigration3 } from './cross-model-3';
import { crossModelMigration4 } from './cross-model-4';
import { crossModelMigration4_1 } from './cross-model-4_1';
import { crossModelMigration4_2 } from './cross-model-4_2';
import { crossModelMigration4_3 } from './cross-model-4_3';
import { crossModelMigration4_4 } from './cross-model-4_4';
import { crossModelMigration4_5 } from './cross-model-4_5';

/* eslint-disable @typescript-eslint/naming-convention */
export const CROSS_MODEL_MIGRATIONS: CrossModelMigrations = {
  2: crossModelMigration2,
  3: crossModelMigration3,
  4: crossModelMigration4,
  4.1: crossModelMigration4_1,
  4.2: crossModelMigration4_2,
  4.3: crossModelMigration4_3,
  4.4: crossModelMigration4_4,
  4.5: crossModelMigration4_5,
} as const;
