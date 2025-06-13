// Re-export all types from the plugin-api package
export * from '@super-productivity/plugin-api';

// Import app-specific types that depend on internal models
import { SnackParams } from '../core/snack/snack.model';

// App-specific type that extends the plugin-api version
export type SnackParamsApp = SnackParams;
