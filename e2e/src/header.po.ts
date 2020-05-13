import {$, browser, ElementFinder, ExpectedConditions, Key} from 'protractor';


export class AppHeader {
  async dynamicAddTask(taskTitle = 'Some Task'): Promise<any> {
    const btn = await this.getAddTaskBtn();
    await btn.click();
    const addTaskBarEl = await this.getDynamicAddTaskBar();
    addTaskBarEl.sendKeys(taskTitle);
    addTaskBarEl.sendKeys(Key.ENTER);
    await $('body').click();
    await browser.wait(ExpectedConditions.invisibilityOf($('add-task-bar.global input')));
  }

  async getDynamicAddTaskBar(): Promise<ElementFinder> {
    const el = $('add-task-bar.global input');
    await browser.wait(ExpectedConditions.elementToBeClickable(el));
    return el;
  }

  async getAddTaskBtn(): Promise<ElementFinder> {
    const el = $('.action-nav > button:first-child');
    await browser.wait(ExpectedConditions.elementToBeClickable(el));
    return el;
  }

}

