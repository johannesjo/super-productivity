import { PluginManifest } from '../plugin-api.model';

/**
 * Simplified manifest validation following KISS principles.
 * Only validate what's absolutely necessary for the app to function.
 */
export const validatePluginManifest = (
  manifest: PluginManifest,
): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  // Only validate critical fields
  if (!manifest?.id) {
    errors.push('Plugin ID is required');
  }

  if (!manifest?.name) {
    errors.push('Plugin name is required');
  }

  if (!manifest?.version) {
    errors.push('Plugin version is required');
  }

  // That's it! Let plugins define whatever else they want.
  // Trust developers to know what they're doing.

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Check if plugin has elevated permissions (simplified)
 */
export const hasNodeExecutionPermission = (manifest: PluginManifest): boolean => {
  return manifest.permissions?.includes('nodeExecution') || false;
};

/**
 * Alias for hasNodeExecutionPermission for compatibility
 */
export const requiresDangerousPermissions = hasNodeExecutionPermission;
