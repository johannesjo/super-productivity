export const tryCatchInline = <T>(fn: () => T, fallback: T): T => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

export const tryCatchInlineAsync = async <T>(
  fn: () => Promise<T>,
  fallback: T,
): Promise<T> => {
  try {
    return await fn();
  } catch {
    return fallback;
  }
};
