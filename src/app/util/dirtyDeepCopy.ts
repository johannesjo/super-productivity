export const dirtyDeepCopy = <T>(val: T): T => JSON.parse(JSON.stringify(val));
