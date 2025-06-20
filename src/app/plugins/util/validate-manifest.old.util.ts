import { PluginManifest, PluginHooks } from '../plugin-api.model';
import { PluginAPI } from '@super-productivity/plugin-api';

// Dynamically extract allowed permissions from PluginAPI interface
const extractPluginAPIPermissions = (): string[] => {
  // Define which methods from PluginAPI should be exposed as permissions
  const permissibleMethods: (keyof PluginAPI)[] = [
    // Task methods
    'getTasks',
    'getArchivedTasks',
    'getCurrentContextTasks',
    'updateTask',
    'addTask',
    // Project methods
    'getAllProjects',
    'addProject',
    'updateProject',
    // Tag methods
    'getAllTags',
    'addTag',
    'updateTag',
    // UI methods
    'showSnack',
    'notify',
    'showIndexHtmlAsView',
    'openDialog',
    // Persistence methods
    'persistDataSynced',
    'loadSyncedData',
    // Hook registration methods (these are always allowed)
    'registerHook',
    'registerHeaderButton',
    'registerMenuEntry',
    'registerShortcut',
    // Node execution (requires special handling)
    'executeNodeScript',
  ];

  // Generate permission strings
  const permissions = permissibleMethods.map((method) => String(method));
  permissions.push('nodeExecution'); // Alias for executeNodeScript
  return permissions;
};

const ALLOWED_PERMISSIONS = extractPluginAPIPermissions();

/**
 * Validate plugin manifest for security and format issues.
 * Shared utility used by plugin-loader.service and plugin-security.service.
 */
export const validatePluginManifest = (
  manifest: PluginManifest,
): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  // Basic validation
  if (!manifest) {
    errors.push('Manifest is required');
    return { isValid: false, errors };
  }

  // Validate required fields
  if (!manifest.id) {
    errors.push('Plugin ID is required');
  } else if (!/^[a-zA-Z0-9_-]+$/.test(manifest.id)) {
    errors.push(
      'Plugin ID contains invalid characters. Only alphanumeric, underscore, and dash are allowed.',
    );
  }

  if (!manifest.name) {
    errors.push('Plugin name is required');
  }

  if (!manifest.version) {
    errors.push('Plugin version is required');
  } else if (!/^\d+\.\d+\.\d+/.test(manifest.version)) {
    errors.push('Plugin version must follow semantic versioning format (x.y.z)');
  }

  if (!manifest.manifestVersion || typeof manifest.manifestVersion !== 'number') {
    errors.push('Manifest version is required and must be a number');
  }

  if (!manifest.minSupVersion) {
    errors.push('Minimum Super Productivity version is required');
  }

  // Validate permissions
  if (!Array.isArray(manifest.permissions)) {
    errors.push('Permissions must be an array');
  } else {
    for (const permission of manifest.permissions) {
      if (!ALLOWED_PERMISSIONS.includes(permission)) {
        errors.push(`Unknown permission requested: ${permission}`);
      }
    }
  }

  // Validate hooks
  if (!Array.isArray(manifest.hooks)) {
    errors.push('Hooks must be an array');
  } else {
    const allowedHooks = Object.values(PluginHooks);
    for (const hook of manifest.hooks) {
      if (!allowedHooks.includes(hook)) {
        errors.push(`Unknown hook requested: ${hook}`);
      }
    }
  }

  // Validate nodeScriptConfig if present
  if (manifest.nodeScriptConfig) {
    // Check for nodeExecution permission
    const hasNodePermission =
      manifest.permissions.includes('nodeExecution') ||
      manifest.permissions.includes('executeNodeScript');
    if (!hasNodePermission) {
      errors.push('nodeScriptConfig requires nodeExecution permission');
    }

    // Validate timeout
    if (manifest.nodeScriptConfig.timeout !== undefined) {
      if (
        manifest.nodeScriptConfig.timeout < 100 ||
        manifest.nodeScriptConfig.timeout > 300000
      ) {
        errors.push(
          'nodeScriptConfig.timeout must be between 100ms and 300000ms (5 minutes)',
        );
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Check if a plugin requires dangerous permissions
 */
export const requiresDangerousPermissions = (manifest: PluginManifest): boolean => {
  const dangerousPermissions = ['nodeExecution', 'executeNodeScript'];
  return manifest.permissions.some((p) => dangerousPermissions.includes(p));
};

/**
 * Check if plugin has node execution permission
 */
export const hasNodeExecutionPermission = (manifest: PluginManifest): boolean => {
  return (
    manifest.permissions.includes('nodeExecution') ||
    manifest.permissions.includes('executeNodeScript')
  );
};
