import { Injectable } from '@angular/core';
import { PluginManifest, PluginHooks } from './plugin-api.model';

// TODO should be simple util functions maybe
@Injectable({
  providedIn: 'root',
})
export class PluginSecurityService {
  private readonly MAX_PLUGIN_SIZE = 500 * 1024; // 500KB
  private readonly DANGEROUS_PATTERNS = [
    /eval\s*\(/,
    /Function\s*\(/,
    // /setTimeout\s*\(/,
    // /setInterval\s*\(/,
    // /XMLHttpRequest/,
    // /fetch\s*\(/,
    /document\./,
    /window\./,
    /global\./,
    /process\./,
    /require\s*\(/,
    /import\s*\(/,
    /__proto__/,
    /constructor/,
    /prototype/,
  ];

  constructor() {}

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

    // Check for attempts to access forbidden globals
    const forbiddenGlobals = ['window', 'document', 'global', 'process', 'require'];
    for (const global of forbiddenGlobals) {
      const regex = new RegExp(`\\b${global}\\b`, 'g');
      if (regex.test(code)) {
        errors.push(`Plugin code attempts to access forbidden global: ${global}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate plugin manifest for security issues
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

    // Validate permissions
    const allowedPermissions = [
      'PluginAPI.getAllTasks',
      'PluginAPI.getArchivedTasks',
      'PluginAPI.getCurrentContextTasks',
      'PluginAPI.updateTask',
      'PluginAPI.showSnack',
      'PluginAPI.notify',
      'PluginAPI.persistDataSynced',
      'PluginAPI.openDialog',
      'PluginAPI.getCfg',
    ];

    for (const permission of manifest.permissions) {
      if (!allowedPermissions.includes(permission)) {
        errors.push(`Unknown permission requested: ${permission}`);
      }
    }

    // Validate hooks
    const allowedHooks = Object.values(PluginHooks);

    for (const hook of manifest.hooks) {
      if (!allowedHooks.includes(hook)) {
        errors.push(`Unknown hook requested: ${hook}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

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
   * Sanitize HTML content from plugins
   */
  sanitizeHtml(html: string): string {
    // Basic HTML sanitization - in production, use a library like DOMPurify
    return html
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
      .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
      .replace(/on\w+\s*=\s*'[^']*'/gi, '')
      .replace(/javascript:/gi, '');
  }

  /**
   * Create a security warning message for users
   */
  getSecurityWarning(): string {
    return `
⚠️ SECURITY WARNING ⚠️

You are about to install a plugin. Plugins can:
- Access your task data
- Modify your tasks
- Show notifications
- Store data locally

Only install plugins from trusted sources. Malicious plugins could:
- Steal your personal data
- Modify or delete your tasks
- Disrupt the application

Do you want to continue?
    `.trim();
  }

  /**
   * Check if a plugin requires elevated permissions
   */
  requiresElevatedPermissions(manifest: PluginManifest): boolean {
    const elevatedPermissions = [
      'PluginAPI.getAllTasks',
      'PluginAPI.getArchivedTasks',
      'PluginAPI.updateTask',
      'PluginAPI.persistDataSynced',
    ];

    return manifest.permissions.some((permission) =>
      elevatedPermissions.includes(permission),
    );
  }
}
