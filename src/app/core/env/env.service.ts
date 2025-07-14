import { Injectable } from '@angular/core';

declare const process: {
  env: {
    [key: string]: string | undefined;
  };
};

@Injectable({
  providedIn: 'root',
})
export class EnvService {
  /**
   * Get an environment variable value.
   * Returns undefined if the variable is not set.
   */
  get(key: string): string | undefined {
    // Check if we're in a browser environment with process.env injected by webpack
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key];
    }
    return undefined;
  }

  /**
   * Get an environment variable value with a default fallback.
   */
  getOrDefault(key: string, defaultValue: string): string {
    return this.get(key) ?? defaultValue;
  }

  /**
   * Check if an environment variable is set.
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Get an environment variable as a boolean.
   * Returns true for 'true', '1', 'yes', 'on' (case-insensitive).
   * Returns false for any other value or if not set.
   */
  getBoolean(key: string): boolean {
    const value = this.get(key)?.toLowerCase();
    return value === 'true' || value === '1' || value === 'yes' || value === 'on';
  }

  /**
   * Get an environment variable as a number.
   * Returns undefined if the value is not a valid number.
   */
  getNumber(key: string): number | undefined {
    const value = this.get(key);
    if (value === undefined) return undefined;
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  }
}
