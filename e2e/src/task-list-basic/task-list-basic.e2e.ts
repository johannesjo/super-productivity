import { NBrowser } from '../../n-browser-interface';
/* eslint-disable @typescript-eslint/naming-convention */

const TODAY_TASKS = 'task-list task';
const TODAY_TASK_1 = `${TODAY_TASKS}:first-of-type`;

module.exports = {
  '@tags': ['task', 'basic'],
  before: (browser: NBrowser) => browser.loadAppAndClickAwayWelcomeDialog(),
  after: (browser: NBrowser) => browser.end(),

  'should start single task': (browser: NBrowser) =>
    browser
      .addTask('0 C task')
      .moveToElement('task', 20, 20)
      .click('.tour-playBtn')
      .pause(100)
      .assert.hasClass(TODAY_TASK_1, 'isCurrent'),
};
