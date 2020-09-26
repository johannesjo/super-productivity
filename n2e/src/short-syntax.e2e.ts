import { BASE } from '../e2e.const';
import { NBrowser } from '../n-browser-interface';

const TASK = 'task';
const TASK_TAGS = 'task tag';
const WORK_VIEW_URL = `${BASE}/`;
const READY_TO_WORK_BTN = '.ready-to-work-btn';

module.exports = {
  '@tags': ['work-view', 'task', 'short-syntax'],

  'should add task with project via short syntax': (browser: NBrowser) => browser
    .url(WORK_VIEW_URL)
    .waitForElementVisible(READY_TO_WORK_BTN)
    .addTask('0 test task koko +s')
    .waitForElementVisible(TASK)
    .assert.visible(TASK)
    .assert.containsText(TASK_TAGS, 'Super Productivity')
    .end(),
};
