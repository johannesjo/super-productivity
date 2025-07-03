import { BatchUpdateRequest, BatchUpdateResult } from '../api/batch-update-types';

// Extend the PluginAPI interface from @super-productivity/plugin-api
declare module '@super-productivity/plugin-api' {
  interface PluginAPI {
    batchUpdateForProject(request: BatchUpdateRequest): Promise<BatchUpdateResult>;
  }
}

// Re-export types for convenience
export * from '../api/batch-update-types';
