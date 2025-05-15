/* eslint-disable @typescript-eslint/naming-convention */
import { NBrowser } from '../n-browser-interface';
import { cssSelectors } from '../e2e.const';
import { saveMetricsResult } from '../helper/save-metrics-result';

const { TASK_LIST } = cssSelectors;

module.exports = {
  '@tags': ['perf', 'performance'],
  'perf: initial load': (browser: NBrowser) =>
    browser
      .enablePerformanceMetrics()
      .loadAppAndClickAwayWelcomeDialog()
      .waitForElementVisible(TASK_LIST)
      .getPerformanceMetrics((r) => saveMetricsResult(r, 'initial-load')),
};
