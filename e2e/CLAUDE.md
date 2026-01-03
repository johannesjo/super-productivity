# E2E Test Reference

## Run Tests

```bash
npm run e2e:playwright:file tests/path/to/test.spec.ts   # Single test
npm run e2e:playwright                                    # All tests
```

## Test Template

```typescript
// Import path depends on test depth: tests/feature/test.spec.ts → ../../fixtures/test.fixture
import { expect, test } from '../../fixtures/test.fixture';

test.describe('Feature', () => {
  test('should X when Y', async ({ workViewPage, taskPage }) => {
    await workViewPage.waitForTaskList();
    await workViewPage.addTask('Task Name');

    const task = taskPage.getTaskByText('Task Name');
    await expect(task).toBeVisible();
  });
});
```

## Fixtures

| Fixture        | Description                                      |
| -------------- | ------------------------------------------------ |
| `workViewPage` | Add tasks, wait for task list                    |
| `taskPage`     | Get/modify individual tasks                      |
| `settingsPage` | Navigate settings, manage plugins                |
| `dialogPage`   | Interact with dialogs                            |
| `projectPage`  | Create/navigate projects                         |
| `testPrefix`   | Auto-applied to task/project names for isolation |

## Key Methods

### workViewPage

- `waitForTaskList()` - Call first in every test
- `addTask(name)` - Add task via global input

### taskPage

- `getTaskByText(text)` → Locator
- `getTask(index)` → Locator (1-based)
- `markTaskAsDone(task)`
- `getTaskCount()` → number
- `waitForTaskWithText(text)` → Locator

### settingsPage

- `navigateToPluginSettings()`
- `uploadPlugin(path)`, `enablePlugin(name)`, `pluginExists(name)`

### dialogPage

- `waitForDialog()` → Locator
- `clickDialogButton(text)`, `clickSaveButton()`
- `waitForDialogToClose()`

### projectPage

- `createProject(name)`
- `navigateToProjectByName(name)`
- `createAndGoToTestProject()` - Quick setup

### Other page objects (instantiate manually)

```typescript
import { PlannerPage, SyncPage, TagPage, NotePage, SideNavPage } from '../../pages';

const plannerPage = new PlannerPage(page);
const tagPage = new TagPage(page, testPrefix);
```

For full method list, read the page object file: `e2e/pages/<name>.page.ts`

## Selectors

```typescript
import { cssSelectors } from '../../constants/selectors';
// Available: TASK, FIRST_TASK, TASK_TITLE, TASK_DONE_BTN, ADD_TASK_INPUT, MAT_DIALOG, SIDENAV
```

## Critical Rules

1. **Always start with** `await workViewPage.waitForTaskList()`
2. **Use page objects** - not raw `page.locator()` for common actions
3. **No `waitForTimeout()`** - use `expect().toBeVisible()` instead
4. **Tests are isolated** - each gets fresh browser context + IndexedDB
