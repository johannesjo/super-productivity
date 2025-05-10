import { NightwatchCallbackResult } from 'nightwatch';

export const saveMetricsResult = (
  result: NightwatchCallbackResult<{ [metricName: string]: number }>,
  fileNameSuffix: string,
): Promise<undefined> => {
  if (result.status === 0) {
    const metrics = result.value;
    console.log(metrics);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('fs').writeFileSync(
      `perf-metrics-${fileNameSuffix}.json`,
      JSON.stringify(metrics, null, 2),
    );
  }
  return Promise.reject('Unable to get perf metrics');
};
