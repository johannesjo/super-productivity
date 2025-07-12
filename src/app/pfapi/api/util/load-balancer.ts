import { PFLog } from '../../../core/log';

export const loadBalancer = <T>(
  asyncTasks: (() => Promise<T>)[],
  batchSize: number,
): Promise<T[]> => {
  return (async () => {
    const results: T[] = [];
    let index = 0;

    while (index < asyncTasks.length) {
      // Get the next batch of asyncTasks
      const batch = asyncTasks.slice(index, index + batchSize);

      // Execute all promises in the current batch concurrently
      PFLog.normal(
        // eslint-disable-next-line no-mixed-operators
        `loadBalancer ${index / batchSize + 1} / ${Math.ceil(asyncTasks.length / batchSize)}`,
      );
      const batchResults = await Promise.all(batch.map((task) => task()));

      // Store results
      results.push(...batchResults);

      // Move to next batch
      index += batchSize;
    }

    return results;
  })();
};
