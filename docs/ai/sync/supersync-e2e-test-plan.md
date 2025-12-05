# SuperSync E2E Test Plan

## Status: PLANNED (Not Yet Implemented)

This plan describes full end-to-end tests for operation-log sync between two browser clients using the real super-sync-server. These tests complement the existing Karma-based integration tests by testing the complete sync flow including network, authentication, and UI.

**Prerequisite:** Basic sync functionality should be working before implementing these tests.

---

## Overview

Test sync between two independent browser clients using:

- Real super-sync-server running in Docker
- Two Playwright browser contexts (isolated IndexedDB, localStorage)
- Same user account configured on both clients
- Real HTTP requests to sync server

## Multi-Client Simulation

Playwright's **Browser Contexts** provide complete isolation:

```
┌─────────────┐          ┌─────────────────┐          ┌─────────────┐
│  Context A  │          │  SuperSync      │          │  Context B  │
│  (Client A) │          │  Server         │          │  (Client B) │
│             │          │                 │          │             │
│ IndexedDB A │──upload──▶│  SQLite DB     │◀──upload──│ IndexedDB B │
│ clientId: X │          │  (shared)       │          │ clientId: Y │
│             │◀─download─│                 │─download─▶│             │
└─────────────┘          └─────────────────┘          └─────────────┘
```

Each context has its own:

- IndexedDB (SUP_OPS store with operations)
- localStorage (unique clientId generated on first load)
- Cookies/session

The server is the only shared component - exactly like real multi-device sync.

---

## Implementation Steps

### Step 1: Add Test Mode to Server

**File:** `packages/super-sync-server/src/config.ts`

```typescript
export interface ServerConfig {
  // ... existing fields ...
  testMode?: {
    enabled: boolean;
    autoVerifyUsers: boolean;
  };
}
```

Environment variable: `TEST_MODE=true`

### Step 2: Add Test-Only Endpoints

**File:** `packages/super-sync-server/src/server.ts` (or new `test-routes.ts`)

Only available when `TEST_MODE=true`:

```typescript
// Register + auto-verify + return JWT in one call
POST /api/test/create-user
Body: { email: string, password: string }
Response: { token: string, userId: number }

// Wipe all test data
POST /api/test/cleanup
Response: { cleaned: true }
```

### Step 3: Create Dockerfile

**File:** `packages/super-sync-server/Dockerfile.test`

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 1900
CMD ["node", "dist/index.js"]
```

### Step 4: Docker Compose Service

**File:** `docker-compose.yaml`

```yaml
services:
  supersync:
    build:
      context: ./packages/super-sync-server
      dockerfile: Dockerfile.test
    ports:
      - '1900:1900'
    environment:
      - PORT=1900
      - TEST_MODE=true
      - JWT_SECRET=e2e-test-secret-minimum-32-chars-long
      - DATA_DIR=/data
    tmpfs:
      - /data # In-memory SQLite for test isolation
```

### Step 5: NPM Scripts

**File:** `package.json`

```json
{
  "e2e:supersync": "docker compose up -d supersync && npm run e2e -- --grep @supersync; docker compose down supersync"
}
```

### Step 6: SuperSync Page Object

**File:** `e2e/pages/supersync.page.ts`

```typescript
import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class SuperSyncPage extends BasePage {
  readonly syncBtn: Locator;
  readonly providerSelect: Locator;
  readonly baseUrlInput: Locator;
  readonly accessTokenInput: Locator;
  readonly saveBtn: Locator;
  readonly syncSpinner: Locator;
  readonly syncCheckIcon: Locator;

  constructor(page: Page) {
    super(page);
    this.syncBtn = page.locator('button.sync-btn');
    this.providerSelect = page.locator('formly-field-mat-select mat-select');
    this.baseUrlInput = page.locator('.e2e-baseUrl input');
    this.accessTokenInput = page.locator('.e2e-accessToken textarea');
    this.saveBtn = page.locator('mat-dialog-actions button[mat-stroked-button]');
    this.syncSpinner = page.locator('.sync-btn mat-icon.spin');
    this.syncCheckIcon = page.locator('.sync-btn mat-icon.sync-state-ico');
  }

  async setupSuperSync(config: { baseUrl: string; accessToken: string }): Promise<void> {
    await this.syncBtn.click();
    await this.providerSelect.waitFor({ state: 'visible' });
    await this.providerSelect.click();

    const superSyncOption = this.page
      .locator('mat-option')
      .filter({ hasText: 'SuperSync' });
    await superSyncOption.waitFor({ state: 'visible' });
    await superSyncOption.click();

    await this.baseUrlInput.waitFor({ state: 'visible' });
    await this.baseUrlInput.fill(config.baseUrl);
    await this.accessTokenInput.fill(config.accessToken);
    await this.saveBtn.click();
  }

  async triggerSync(): Promise<void> {
    await this.syncBtn.click();
    await Promise.race([
      this.syncSpinner.waitFor({ state: 'visible', timeout: 1000 }).catch(() => {}),
      this.syncCheckIcon.waitFor({ state: 'visible', timeout: 1000 }).catch(() => {}),
    ]);
  }

  async waitForSyncComplete(): Promise<void> {
    await this.syncSpinner.waitFor({ state: 'hidden', timeout: 30000 });
    await this.syncCheckIcon.waitFor({ state: 'visible' });
  }
}
```

### Step 7: Test Helpers

**File:** `e2e/utils/supersync-helpers.ts`

```typescript
const SUPERSYNC_BASE_URL = 'http://localhost:1900';

export async function createTestUser(
  testId: string,
): Promise<{ email: string; token: string }> {
  const response = await fetch(`${SUPERSYNC_BASE_URL}/api/test/create-user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `test-${testId}@e2e.local`,
      password: 'TestPassword123!',
    }),
  });
  if (!response.ok) throw new Error(`Failed to create test user: ${response.status}`);
  return response.json();
}

export async function cleanupTestData(): Promise<void> {
  await fetch(`${SUPERSYNC_BASE_URL}/api/test/cleanup`, { method: 'POST' });
}

export function getSuperSyncConfig(token: string) {
  return { baseUrl: SUPERSYNC_BASE_URL, accessToken: token };
}
```

### Step 8: Extend Test Fixtures

**File:** `e2e/fixtures/test.fixture.ts`

Add `testRunId` for unique test isolation:

```typescript
testRunId: async ({}, use, testInfo) => {
  const runId = `${Date.now()}-${testInfo.workerIndex}`;
  await use(runId);
},
```

---

## Test Scenarios

### File: `e2e/tests/sync/supersync.spec.ts`

```typescript
import { test, expect } from '../../fixtures/test.fixture';
import { SuperSyncPage } from '../../pages/supersync.page';
import { WorkViewPage } from '../../pages/work-view.page';
import { createTestUser, getSuperSyncConfig } from '../../utils/supersync-helpers';
import { waitForAppReady } from '../../utils/waits';

test.describe('@supersync SuperSync E2E', () => {
  test('basic sync: Client A creates task, Client B sees it', async ({
    browser,
    baseURL,
    testRunId,
  }) => {
    // 1. Create shared test user
    const user = await createTestUser(testRunId);
    const syncConfig = getSuperSyncConfig(user.token);

    // 2. Set up Client A
    const contextA = await browser.newContext({ storageState: undefined, baseURL });
    const pageA = await contextA.newPage();
    await pageA.goto('/');
    await waitForAppReady(pageA);
    const syncA = new SuperSyncPage(pageA);
    const workA = new WorkViewPage(pageA, `A-${testRunId}`);

    // 3. Configure sync on Client A
    await syncA.setupSuperSync(syncConfig);

    // 4. Create task on Client A
    const taskName = `Task-${testRunId}-from-A`;
    await workA.addTask(taskName);

    // 5. Sync Client A (upload)
    await syncA.triggerSync();
    await syncA.waitForSyncComplete();

    // 6. Set up Client B
    const contextB = await browser.newContext({ storageState: undefined, baseURL });
    const pageB = await contextB.newPage();
    await pageB.goto('/');
    await waitForAppReady(pageB);
    const syncB = new SuperSyncPage(pageB);

    // 7. Configure sync on Client B (same account)
    await syncB.setupSuperSync(syncConfig);

    // 8. Sync Client B (download)
    await syncB.triggerSync();
    await syncB.waitForSyncComplete();

    // 9. Verify Client B has the task
    await expect(pageB.locator(`task:has-text("${taskName}")`)).toBeVisible();

    // Cleanup
    await contextA.close();
    await contextB.close();
  });

  test('bidirectional: both clients create tasks', async ({
    browser,
    baseURL,
    testRunId,
  }) => {
    const user = await createTestUser(testRunId);
    const syncConfig = getSuperSyncConfig(user.token);

    // Set up both clients
    const contextA = await browser.newContext({ storageState: undefined, baseURL });
    const pageA = await contextA.newPage();
    await pageA.goto('/');
    await waitForAppReady(pageA);
    const syncA = new SuperSyncPage(pageA);
    const workA = new WorkViewPage(pageA, `A-${testRunId}`);
    await syncA.setupSuperSync(syncConfig);

    const contextB = await browser.newContext({ storageState: undefined, baseURL });
    const pageB = await contextB.newPage();
    await pageB.goto('/');
    await waitForAppReady(pageB);
    const syncB = new SuperSyncPage(pageB);
    const workB = new WorkViewPage(pageB, `B-${testRunId}`);
    await syncB.setupSuperSync(syncConfig);

    // Both create tasks
    const taskFromA = `Task-${testRunId}-from-A`;
    const taskFromB = `Task-${testRunId}-from-B`;
    await workA.addTask(taskFromA);
    await workB.addTask(taskFromB);

    // Client A syncs (uploads)
    await syncA.triggerSync();
    await syncA.waitForSyncComplete();

    // Client B syncs (uploads + downloads)
    await syncB.triggerSync();
    await syncB.waitForSyncComplete();

    // Client A syncs again (downloads B's task)
    await syncA.triggerSync();
    await syncA.waitForSyncComplete();

    // Verify both see both tasks
    await expect(pageA.locator(`task:has-text("${taskFromA}")`)).toBeVisible();
    await expect(pageA.locator(`task:has-text("${taskFromB}")`)).toBeVisible();
    await expect(pageB.locator(`task:has-text("${taskFromA}")`)).toBeVisible();
    await expect(pageB.locator(`task:has-text("${taskFromB}")`)).toBeVisible();

    await contextA.close();
    await contextB.close();
  });

  test('conflict: both edit same task', async ({ browser, baseURL, testRunId }) => {
    const user = await createTestUser(testRunId);
    const syncConfig = getSuperSyncConfig(user.token);

    // Set up Client A, create task, sync
    const contextA = await browser.newContext({ storageState: undefined, baseURL });
    const pageA = await contextA.newPage();
    await pageA.goto('/');
    await waitForAppReady(pageA);
    const syncA = new SuperSyncPage(pageA);
    const workA = new WorkViewPage(pageA, `A-${testRunId}`);
    await syncA.setupSuperSync(syncConfig);

    const taskName = `Shared-${testRunId}`;
    await workA.addTask(taskName);
    await syncA.triggerSync();
    await syncA.waitForSyncComplete();

    // Set up Client B, sync to get the task
    const contextB = await browser.newContext({ storageState: undefined, baseURL });
    const pageB = await contextB.newPage();
    await pageB.goto('/');
    await waitForAppReady(pageB);
    const syncB = new SuperSyncPage(pageB);
    await syncB.setupSuperSync(syncConfig);
    await syncB.triggerSync();
    await syncB.waitForSyncComplete();

    // Both have the task now
    await expect(pageB.locator(`task:has-text("${taskName}")`)).toBeVisible();

    // Client A marks done (offline)
    const taskA = pageA.locator(`task:has-text("${taskName}")`);
    await taskA.locator('.mat-mdc-checkbox').click();

    // Client B changes something else (offline)
    // ... (could add notes, change estimate, etc.)

    // Client A syncs
    await syncA.triggerSync();
    await syncA.waitForSyncComplete();

    // Client B syncs - may detect conflict
    await syncB.triggerSync();
    await syncB.waitForSyncComplete();

    // Final sync to converge
    await syncA.triggerSync();
    await syncA.waitForSyncComplete();

    // Verify consistent state (task count should match)
    const countA = await pageA.locator('task').count();
    const countB = await pageB.locator('task').count();
    expect(countA).toBe(countB);

    await contextA.close();
    await contextB.close();
  });
});
```

---

## Data Isolation Strategy

- **Unique test user per test**: `test-{timestamp}-{workerIndex}@e2e.local`
- **Task prefixes**: `A-{testRunId}-TaskName` for clear identification
- **In-memory SQLite**: Server uses `tmpfs` mount, no data persists between runs
- **Isolated browser contexts**: Each client has separate IndexedDB

---

## Running the Tests

```bash
# Start server and run all supersync tests
npm run e2e:supersync

# Manual execution (server must be running)
docker compose up -d supersync
npm run e2e:playwright:file e2e/tests/sync/supersync.spec.ts
docker compose down supersync
```

---

## Files to Create/Modify

| File                                         | Action                    |
| -------------------------------------------- | ------------------------- |
| `packages/super-sync-server/src/config.ts`   | Add testMode config       |
| `packages/super-sync-server/src/auth.ts`     | Add test mode bypass      |
| `packages/super-sync-server/src/server.ts`   | Add test-only routes      |
| `packages/super-sync-server/Dockerfile.test` | Create                    |
| `docker-compose.yaml`                        | Add supersync service     |
| `package.json`                               | Add e2e:supersync scripts |
| `e2e/pages/supersync.page.ts`                | Create                    |
| `e2e/utils/supersync-helpers.ts`             | Create                    |
| `e2e/fixtures/test.fixture.ts`               | Add testRunId             |
| `e2e/tests/sync/supersync.spec.ts`           | Create                    |

---

## Comparison with Integration Tests

| Aspect      | Karma Integration Tests    | Playwright E2E Tests    |
| ----------- | -------------------------- | ----------------------- |
| Location    | `src/app/.../integration/` | `e2e/tests/sync/`       |
| Server      | Mocked/simulated           | Real super-sync-server  |
| Browser     | ChromeHeadless (single)    | Multiple contexts       |
| Speed       | Fast (~seconds)            | Slower (~minutes)       |
| Purpose     | Logic verification         | Full flow validation    |
| When to run | Every PR                   | Before release / manual |

Both test types are valuable. Integration tests catch logic bugs quickly; E2E tests catch integration issues in the full stack.
