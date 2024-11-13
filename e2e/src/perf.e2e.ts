import { BASE } from '../e2e.const';
import { NBrowser } from '../n-browser-interface';
import { NightwatchCallbackResult } from 'nightwatch';
/* eslint-disable @typescript-eslint/naming-convention */

const TASK = 'task';
const WORK_VIEW_URL = `${BASE}/`;
const READY_TO_WORK_BTN = '.ready-to-work-btn';

const saveMetricsResult = (
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

module.exports = {
  '@tags': ['perf', 'performance'],
  'perf: initial load': (browser: NBrowser) =>
    browser
      .enablePerformanceMetrics()
      .loadAppAndClickAwayWelcomeDialog(WORK_VIEW_URL)
      .waitForElementVisible(READY_TO_WORK_BTN)
      .getPerformanceMetrics((r) => saveMetricsResult(r, 'initial-load'))
      .end(),

  'perf: adding tasks': (browser: NBrowser) =>
    browser
      .enablePerformanceMetrics()
      .loadAppAndClickAwayWelcomeDialog(WORK_VIEW_URL)
      .waitForElementVisible(READY_TO_WORK_BTN)
      .addTask('1 test task koko')
      .addTask('2 test task koko')
      .addTask('3 test task koko')
      .addTask('4 test task koko')
      .addTask('5 test task koko')
      .addTask('6 test task koko')
      .addTask('7 test task koko')
      .addTask('8 test task koko')
      .addTask('9 test task koko')
      .addTask('10 test task koko')
      .addTask('11 test task koko')
      .addTask('12 test task koko')
      .addTask('13 test task koko')
      .addTask('14 test task koko')
      .addTask('15 test task koko')
      .addTask('16 test task koko')
      .addTask('17 test task koko')
      .addTask('18 test task koko')
      .addTask('19 test task koko')
      .addTask('20 test task koko')
      .waitForElementVisible(TASK)
      .getPerformanceMetrics((r) => saveMetricsResult(r, 'create-tasks'))
      .end(),
};
