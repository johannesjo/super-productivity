import {$, browser, by, element, ElementFinder, ExpectedConditions, Key} from 'protractor';


export class AppHeader {
  async dynamicAddTask(taskTitle = 'Some Task'): Promise<any> {
    const btn = await this.getAddTaskBtn();
    await btn.click();
    const addTaskBarEl = await this.getDynamicAddTaskBar();
    addTaskBarEl.sendKeys(taskTitle);
    addTaskBarEl.sendKeys(Key.ENTER);
    await $('body').click();
    await browser.wait(ExpectedConditions.invisibilityOf($('add-task-bar input')));
  }

  async getDynamicAddTaskBar(): Promise<ElementFinder> {
    const elStr = 'add-task-bar input';
    await browser.wait(ExpectedConditions.elementToBeClickable($(elStr)));
    return element(by.css(elStr));
  }

  async getAddTaskBtn(): Promise<ElementFinder> {
    const elStr = '.action-nav button:first-child';
    await browser.wait(ExpectedConditions.elementToBeClickable($(elStr)));
    return element(by.css(elStr));
  }

}

