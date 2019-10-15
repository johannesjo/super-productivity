import {WorkViewPage} from './work-view.po';
import {ENTER} from '@angular/cdk/keycodes';

describe('work view', () => {
  let page: WorkViewPage;

  beforeEach(() => {
    page = new WorkViewPage();
  });

  it('should add a task', async () => {
    await page.navigateTo();
    const at = await page.getAddTaskBar();
    await at.isSelected();
    at.sendKeys('Some task');
    at.sendKeys(ENTER);

    expect(page.getTasks().count()).toBe(1);
    // page.keyboard.press('Enter');
  });
});
