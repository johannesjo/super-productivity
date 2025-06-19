import { Injectable } from '@angular/core';
import { PluginHooks, PluginManifest } from './plugin-api.model';
import { PluginAPI } from '@super-productivity/plugin-api';

// TODO should be simple util functions maybe
@Injectable({
  providedIn: 'root',
})
export class PluginSecurityService {
  // Dynamically extract allowed permissions from PluginAPI interface
  private readonly ALLOWED_PERMISSIONS: string[] = this.extractPluginAPIPermissions();
  private readonly MAX_PLUGIN_SIZE = 500 * 1024; // 500KB
  private readonly DANGEROUS_PATTERNS = [
    // Very minimal patterns - only block the most obvious security issues
    // Only block eval with string literals
    /\beval\s*\(\s*["'`]/,
    // Only block new Function with string literals
    /new\s+Function\s*\(\s*["'`]/,
    // Block dangerous Node.js APIs only with string literals
    /require\s*\(\s*['"`](fs|child_process|vm|cluster)['"`]\s*\)/,
    // Block direct prototype manipulation
    /__proto__/,
    // Allow everything else for maximum compatibility
  ];

  constructor() {}

  /**
   * Dynamically extract allowed permissions from PluginAPI interface.
   * Uses TypeScript's keyof operator to ensure only actual PluginAPI methods can be specified.
   */
  private extractPluginAPIPermissions(): string[] {
    // Define which methods from PluginAPI should be exposed as permissions
    // TypeScript will enforce that these are actual methods from the PluginAPI interface
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
    // Add alias for nodeExecution permission
    const permissions = permissibleMethods.map((method) => String(method));
    permissions.push('nodeExecution'); // Alias for executeNodeScript
    return permissions;
  }

  /**
   * Validate plugin code for security issues
   */
  validatePluginCode(code: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check plugin size
    if (code.length > this.MAX_PLUGIN_SIZE) {
      errors.push(`Plugin code exceeds maximum size of ${this.MAX_PLUGIN_SIZE} bytes`);
    }

    // Check for dangerous patterns
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(code)) {
        errors.push(
          `Plugin code contains potentially dangerous pattern: ${pattern.source}`,
        );
      }
    }

    // Check for attempts to access forbidden globals - be more specific
    // Only check for actual dangerous usage, not just the word appearing
    const forbiddenPatterns = [
      { pattern: /\bprocess\s*\.\s*exit/, name: 'process.exit' },
      { pattern: /\brequire\s*\(\s*['"`]fs['"`]\)/, name: 'require("fs")' },
      {
        pattern: /\brequire\s*\(\s*['"`]child_process['"`]\)/,
        name: 'require("child_process")',
      },
    ];

    for (const { pattern, name } of forbiddenPatterns) {
      if (pattern.test(code)) {
        errors.push(`Plugin code attempts to use forbidden API: ${name}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate plugin manifest for security issues.
   * Uses dynamically extracted permissions from PluginAPI to stay in sync with API changes.
   */
  validatePluginManifest(manifest: PluginManifest): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate plugin ID format (should be safe for file system)
    if (!/^[a-zA-Z0-9_-]+$/.test(manifest.id)) {
      errors.push(
        'Plugin ID contains invalid characters. Only alphanumeric, underscore, and dash are allowed.',
      );
    }

    // Check for reasonable version format
    if (!/^\d+\.\d+\.\d+/.test(manifest.version)) {
      errors.push('Plugin version must follow semantic versioning format (x.y.z)');
    }

    // Validate permissions using dynamically extracted list
    for (const permission of manifest.permissions) {
      if (!this.ALLOWED_PERMISSIONS.includes(permission)) {
        errors.push(`Unknown permission requested: ${permission}`);
      }
    }

    // Validate hooks (still using enum values as they're defined in the model)
    const allowedHooks = Object.values(PluginHooks);

    for (const hook of manifest.hooks) {
      if (!allowedHooks.includes(hook)) {
        errors.push(`Unknown hook requested: ${hook}`);
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
  }

  // TODO remove
  /**
   * Check if plugin assets are safe
   */
  validatePluginAssets(assets: string[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const allowedExtensions = ['.svg', '.png', '.jpg', '.jpeg', '.gif', '.css', '.html'];

    for (const asset of assets) {
      // Check for path traversal attempts
      if (asset.includes('../') || asset.includes('..\\')) {
        errors.push(`Asset path contains path traversal: ${asset}`);
        continue;
      }

      // Check file extension
      const extension = asset.toLowerCase().substring(asset.lastIndexOf('.'));
      if (!allowedExtensions.includes(extension)) {
        errors.push(`Asset has disallowed extension: ${asset}`);
      }

      // Check for absolute paths
      if (asset.startsWith('/') || asset.includes(':')) {
        errors.push(`Asset path must be relative: ${asset}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Sanitize HTML content from plugins with comprehensive security measures
   */
  sanitizeHtml(html: string): string {
    // Comprehensive HTML sanitization
    return (
      html
        // Remove dangerous elements completely
        .replace(/<iframe[^>]*>.*?<\/iframe>/gis, '')
        .replace(/<object[^>]*>.*?<\/object>/gis, '')
        .replace(/<embed[^>]*>/gi, '')
        .replace(/<applet[^>]*>.*?<\/applet>/gis, '')
        .replace(/<meta[^>]*>/gi, '')
        .replace(/<base[^>]*>/gi, '')
        // .replace(/<script[^>]*>.*?<\/script>/gis, '')
        // .replace(/<link[^>]*>/gi, '')
        // .replace(/<form[^>]*>.*?<\/form>/gis, '')
        // .replace(/<input[^>]*>/gi, '')
        // .replace(/<textarea[^>]*>.*?<\/textarea>/gis, '')
        // .replace(/<select[^>]*>.*?<\/select>/gis, '')
        // .replace(/<style[^>]*>.*?<\/style>/gis, '')

        // Remove event handlers
        // .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
        // .replace(/\son\w+\s*=\s*[^>\s]+/gi, '')

        // Remove dangerous URLs
        // .replace(/javascript\s*:/gi, 'removed:')
        // .replace(/data\s*:/gi, 'removed:')
        // .replace(/vbscript\s*:/gi, 'removed:')
        // .replace(/livescript\s*:/gi, 'removed:')
        // .replace(/mocha\s*:/gi, 'removed:')

        // Remove dangerous attributes
        // .replace(/\bsrc\s*=\s*["']javascript[^"']*["']/gi, '')
        // .replace(/\bhref\s*=\s*["']javascript[^"']*["']/gi, '')
        .replace(/\baction\s*=\s*["'][^"']*["']/gi, '')
        .replace(/\bformaction\s*=\s*["'][^"']*["']/gi, '')

        // Sanitize style attributes to prevent CSS injection
        .replace(/\bstyle\s*=\s*["']([^"']*)["']/gi, (match, styleContent) => {
          const sanitizedStyle = styleContent
            .replace(/expression\s*\(/gi, 'removed(')
            .replace(/javascript\s*:/gi, 'removed:')
            .replace(/vbscript\s*:/gi, 'removed:')
            .replace(/@import/gi, 'removed')
            .replace(/behavior\s*:/gi, 'removed:')
            .replace(/-moz-binding/gi, 'removed')
            .replace(/url\s*\(\s*["']?javascript/gi, 'url("removed');
          return `style="${sanitizedStyle}"`;
        })
    );
  }

  /**
   * Check if a plugin requires dangerous permissions
   */
  requiresDangerousPermissions(manifest: PluginManifest): boolean {
    const dangerousPermissions = ['nodeExecution', 'executeNodeScript'];
    return manifest.permissions.some((p) => dangerousPermissions.includes(p));
  }

  /**
   * Check if plugin has node execution permission
   */
  hasNodeExecutionPermission(manifest: PluginManifest): boolean {
    return (
      manifest.permissions.includes('nodeExecution') ||
      manifest.permissions.includes('executeNodeScript')
    );
  }
}
