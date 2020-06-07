import {NightwatchBrowser} from 'nightwatch';
import {Key} from 'protractor';
import {BASE} from './e2e.const';


const ADD_TASK_INITIAL_SEL = 'add-task-bar:not(.global) input';
const ADD_TASK_GLOBAL_SEL = 'add-task-bar.global input';
const TASK_SEL = 'task';
const ADD_TASK_BTN_SEL = '.action-nav > button:first-child';
const WORK_VIEW_URL = `${BASE}/`;

module.exports = {
  'should add a task': (browser: NightwatchBrowser) => browser
    .url(WORK_VIEW_URL)
    .waitForElementVisible(ADD_TASK_INITIAL_SEL)

    .setValue(ADD_TASK_INITIAL_SEL, '1 test task hihi')
    .setValue(ADD_TASK_INITIAL_SEL, Key.ENTER)

    .waitForElementVisible(TASK_SEL)
    .assert.visible(TASK_SEL)
    .assert.containsText(TASK_SEL, '1 test task hihi')
    .end(),

  'should add 2 tasks': (browser: NightwatchBrowser) => browser
    .url(WORK_VIEW_URL)
    .waitForElementVisible(ADD_TASK_INITIAL_SEL)

    .setValue(ADD_TASK_INITIAL_SEL, '2 test task hihi')
    .setValue(ADD_TASK_INITIAL_SEL, Key.ENTER)
    .setValue(ADD_TASK_INITIAL_SEL, '3 some other task')
    .setValue(ADD_TASK_INITIAL_SEL, Key.ENTER)

    .waitForElementVisible(TASK_SEL)
    .assert.visible(TASK_SEL)
    .assert.containsText(TASK_SEL + ':nth-child(1)', '2 test task hihi')
    .assert.containsText(TASK_SEL + ':nth-child(2)', '3 some other task')
    .end(),


  'should add multiple tasks from header button': (browser: NightwatchBrowser) => browser
    .url(WORK_VIEW_URL)
    .waitForElementVisible(ADD_TASK_BTN_SEL)
    .click(ADD_TASK_BTN_SEL)
    .waitForElementVisible(ADD_TASK_GLOBAL_SEL)

    .setValue(ADD_TASK_GLOBAL_SEL, '4 test task hohoho')
    .setValue(ADD_TASK_GLOBAL_SEL, Key.ENTER)
    .setValue(ADD_TASK_GLOBAL_SEL, '5 some other task xoxo')
    .setValue(ADD_TASK_GLOBAL_SEL, Key.ENTER)

    .waitForElementVisible(TASK_SEL)
    .assert.visible(TASK_SEL)
    // NOTE: global adds to top rather than bottom
    .assert.containsText(TASK_SEL + ':nth-child(1)', '5 some other task xoxo')
    .assert.containsText(TASK_SEL + ':nth-child(2)', '4 test task hohoho')
    .end(),
};
