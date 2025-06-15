import { NBrowser } from '../../n-browser-interface';
/* eslint-disable @typescript-eslint/naming-convention */

const TODAY_TASKS = 'task-list task';
const TODAY_TASK_1 = `${TODAY_TASKS}:first-of-type`;

module.exports = {
  '@tags': ['task', 'basic'],
  before: (browser: NBrowser) => browser.loadAppAndClickAwayWelcomeDialog(),
  after: (browser: NBrowser) => browser.end(),

  'should start and stop single task': (browser: NBrowser) =>
    browser
      .addTask('0 C task')
      .moveToElement('task', 20, 20)
      .click('.tour-playBtn')
      .pause(50)
      .assert.hasClass(TODAY_TASK_1, 'isCurrent')
      .click('.tour-playBtn')
      .pause(50)
      .assert.not.hasClass(TODAY_TASK_1, 'isCurrent'),
};
