import {browser, by, element, ElementFinder} from 'protractor';

export class WorkViewPage {
  navigateTo() {
    return browser.get('/');
  }

  getAddTaskBar(): ElementFinder {
    return element(by.css('input.mat-autocomplete-trigger'));
  }

  getTasks() {
    return element.all(by.css('task'));
  }
}
