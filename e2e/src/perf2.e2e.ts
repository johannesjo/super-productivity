/* eslint-disable @typescript-eslint/naming-convention */
import { NBrowser } from '../n-browser-interface';
import { cssSelectors } from '../e2e.const';
import { saveMetricsResult } from '../helper/save-metrics-result';

const { TASK_LIST } = cssSelectors;

const TASK = 'task';

module.exports = {
  '@tags': ['perf', 'performance'],
  'perf: adding tasks': (browser: NBrowser) =>
    browser
      .enablePerformanceMetrics()
      .loadAppAndClickAwayWelcomeDialog()
      .waitForElementVisible(TASK_LIST)
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
      .getPerformanceMetrics((r) => saveMetricsResult(r, 'create-tasks')),
};
