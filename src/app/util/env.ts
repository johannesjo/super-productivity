/**
 * Pure functions for accessing environment variables.
 * These can be used anywhere in the codebase, including outside Angular context.
 */

// Import the generated environment constants
// This file is auto-generated from .env by tools/load-env.js
import { ENV } from '../config/env.generated';

/**
 * Get an environment variable value.
 * Returns undefined if the variable is not set.
 */
export const getEnv = (key: keyof typeof ENV): string | undefined => {
  return ENV[key] || undefined;
};

/**
 * Get an optional environment variable that may not be in the required list.
 * Use this for environment variables that are truly optional and may not be defined
 * in the REQUIRED_ENV_KEYS list in load-env.js.
 * Returns undefined if the variable is not set.
 */
export const getEnvOptional = (key: string): string | undefined => {
  return (ENV as any)[key] || undefined;
};

/**
 * Get an environment variable as a number.
 * Returns undefined if the value is not a valid number.
 */
export const getEnvNumber = (key: keyof typeof ENV): number | undefined => {
  const value = getEnv(key);
  if (value === undefined) return undefined;
  const num = Number(value);
  return isNaN(num) ? undefined : num;
};

/**
 * Get all environment variables as an object.
 * Useful for debugging or passing multiple values.
 */
export const getAllEnv = (): typeof ENV => ENV;
