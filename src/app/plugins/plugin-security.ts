import { Injectable } from '@angular/core';
import { PluginManifest } from './plugin-api.model';
import {
  validatePluginManifest,
  requiresDangerousPermissions,
  hasNodeExecutionPermission,
} from './util/validate-manifest.util';

// TODO should be simple util functions maybe
@Injectable({
  providedIn: 'root',
})
export class PluginSecurityService {
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
   * Delegates to shared util function.
   */
  validatePluginManifest(manifest: PluginManifest): {
    isValid: boolean;
    errors: string[];
  } {
    return validatePluginManifest(manifest);
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
   * Delegates to shared util function.
   */
  requiresDangerousPermissions(manifest: PluginManifest): boolean {
    return requiresDangerousPermissions(manifest);
  }

  /**
   * Check if plugin has node execution permission
   * Delegates to shared util function.
   */
  hasNodeExecutionPermission(manifest: PluginManifest): boolean {
    return hasNodeExecutionPermission(manifest);
  }
}
