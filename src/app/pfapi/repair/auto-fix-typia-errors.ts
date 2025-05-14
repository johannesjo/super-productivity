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
      const keys = path.split('.');
      const value = getValueByPath(data, keys);
      console.warn('Auto-fixing error:', error);
      if (error.expected.includes('number')) {
        if (typeof value === 'string') {
          const parsedValue = parseFloat(value);
          if (!isNaN(parsedValue)) {
            setValueByPath(data, keys, parsedValue);
          }
        }
      } else if (error.expected.includes('undefined')) {
        if (value === null) {
          setValueByPath(data, keys, undefined);
        }
      } else if (error.expected.includes('null')) {
        if (value === undefined) {
          setValueByPath(data, keys, null);
        }
      } else if (error.expected.includes('boolean')) {
        if (!value) {
          setValueByPath(data, keys, false);
        }
      }
    }
  });
  return data;
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
