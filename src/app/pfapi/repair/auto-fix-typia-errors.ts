import { AppDataCompleteNew } from '../pfapi-config';
import { IValidation } from 'typia';

export const autoFixTypiaErrors = (
  data: AppDataCompleteNew,
  errors: IValidation.IError[],
): AppDataCompleteNew => {
  if (!errors || errors.length === 0) {
    return data;
  }
  errors.forEach((error) => {
    if (error.path.startsWith('$input')) {
      const path = error.path.replace('$input.', '');
      const keys = parsePath(path);
      const value = getValueByPath(data, keys);
      console.warn('Auto-fixing error:', error);
      if (error.expected.includes('number') && typeof value === 'string') {
        const parsedValue = parseFloat(value);
        if (!isNaN(parsedValue)) {
          setValueByPath(data, keys, parsedValue);
        }
      } else if (error.expected.includes('undefined') && value === null) {
        setValueByPath(data, keys, undefined);
      } else if (error.expected.includes('null') && value === undefined) {
        setValueByPath(data, keys, null);
      } else if (error.expected.includes('boolean') && !value) {
        setValueByPath(data, keys, false);
      } else if (keys[0] === 'task' && error.expected.includes('number')) {
        setValueByPath(data, keys, 0);
      }
    }
  });
  return data;
};

/**
 * Parse a path string into an array of keys, handling both dot notation and bracket notation.
 * Example: 'task.entities["BbgHI8-2NZ7zBn7BNVQPG"].timeEstimate' becomes
 * ['task', 'entities', 'BbgHI8-2NZ7zBn7BNVQPG', 'timeEstimate']
 */
const parsePath = (path: string): (string | number)[] => {
  const keys: (string | number)[] = [];
  const pathParts = path.split('.');

  for (const part of pathParts) {
    if (part.includes('[')) {
      const partsInner = part.replace(/\]/g, '').replace(/\"/g, '').split('[');
      partsInner.forEach((innerPart) => keys.push(innerPart));
    } else {
      keys.push(part);
    }
  }
  return keys;
};

const getValueByPath = <T, R = any>(obj: T, path: (string | number)[]): R | undefined =>
  path.reduce<any>((acc, key) => acc?.[key], obj);

const setValueByPath = <T extends object>(
  obj: T,
  path: (string | number)[],
  value: any,
): void => {
  if (!Array.isArray(path) || path.length === 0) return;
  console.warn('Auto-fixing error =>', path, value);

  let current: any = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
      current[key] = typeof path[i + 1] === 'number' ? [] : {};
    }
    current = current[key];
  }

  current[path[path.length - 1]] = value;
};
