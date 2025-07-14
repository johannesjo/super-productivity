/**
 * Pure functions for accessing environment variables.
 * These can be used anywhere in the codebase, including outside Angular context.
 */

/**
 * Get an environment variable value.
 * Returns undefined if the variable is not set.
 */
export const getEnv = (key: string): string | undefined => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
};

/**
 * Get an environment variable value with a default fallback.
 */
export const getEnvOrDefault = (key: string, defaultValue: string): string => {
  return getEnv(key) ?? defaultValue;
};

/**
 * Get an environment variable as a boolean.
 * Returns true for 'true', '1', 'yes', 'on' (case-insensitive).
 * Returns false for any other value or if not set.
 */
export const getEnvBoolean = (key: string): boolean => {
  const value = getEnv(key)?.toLowerCase();
  return value === 'true' || value === '1' || value === 'yes' || value === 'on';
};

/**
 * Get an environment variable as a number.
 * Returns undefined if the value is not a valid number.
 */
export const getEnvNumber = (key: string): number | undefined => {
  const value = getEnv(key);
  if (value === undefined) return undefined;
  const num = Number(value);
  return isNaN(num) ? undefined : num;
};
