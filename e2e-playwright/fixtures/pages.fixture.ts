import { test as baseTest } from '@playwright/test';
import { WorkViewPage } from '../pages/work-view.page';
import { TagPage } from '../pages/tag.page';
import { DialogComponent } from '../components/dialog.component';
import { WelcomeDialogComponent } from '../components/welcome-dialog.component';
import { AutocompleteComponent } from '../components/autocomplete.component';

type PageFixtures = {
  workViewPage: WorkViewPage;
  tagPage: TagPage;
  dialogComponent: DialogComponent;
  welcomeDialog: WelcomeDialogComponent;
  autocomplete: AutocompleteComponent;
};

export const test = baseTest.extend<PageFixtures>({
  workViewPage: async ({ page }, use) => {
    await use(new WorkViewPage(page));
  },

  tagPage: async ({ page }, use) => {
    await use(new TagPage(page));
  },

  dialogComponent: async ({ page }, use) => {
    await use(new DialogComponent(page));
  },

  welcomeDialog: async ({ page }, use) => {
    await use(new WelcomeDialogComponent(page));
  },

  autocomplete: async ({ page }, use) => {
    await use(new AutocompleteComponent(page));
  },
});

export { expect } from '@playwright/test';
