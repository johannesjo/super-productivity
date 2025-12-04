# Integration Test Concept for Operation Log

## Implementation Status: COMPLETE

All integration tests have been implemented and pass:

- **16 tests** in `multi-client-sync.integration.spec.ts`
- **17 tests** in `state-consistency.integration.spec.ts`

## Recommendation Summary

**Use Karma-based integration tests** (not Playwright E2E) for the following reasons:

- Karma runs in ChromeHeadless with full IndexedDB support
- Existing `operation-log-store.service.spec.ts` already demonstrates real IndexedDB testing
- Service-level tests are faster and more deterministic than full E2E
- Better control over vector clocks, clientIds, and operation timing

## File Structure

```
src/app/core/persistence/operation-log/
  integration/
    helpers/
      test-client.helper.ts          # Simulated client with its own clientId/vectorClock
      operation-factory.helper.ts    # Factories for creating test operations
      state-assertions.helper.ts     # Assertion helpers for state verification
    multi-client-sync.integration.spec.ts
    state-consistency.integration.spec.ts
```

## Key Test Utilities

### TestClient Helper

Simulates a client with its own `clientId` and vector clock:

```typescript
class TestClient {
  readonly clientId: string;
  private vectorClock: VectorClock = {};

  createOperation(params): Operation {
    this.vectorClock[this.clientId]++;
    return { ...params, clientId: this.clientId, vectorClock: { ...this.vectorClock } };
  }

  mergeRemoteClock(remoteClock: VectorClock): void {
    this.vectorClock = mergeVectorClocks(this.vectorClock, remoteClock);
  }
}
```

### Operation Factories

Extend existing `createTestOperation` pattern from `operation-log-store.service.spec.ts:12-24`:

```typescript
const createTaskOperation = (client: TestClient, taskId: string, opType: OpType, payload): Operation
const createProjectOperation = (client: TestClient, projectId: string, opType: OpType, payload): Operation
```

## Test Scenarios

### Category 1: Multi-Client Sync (multi-client-sync.integration.spec.ts)

| Scenario                                 | Description                                                                             |
| ---------------------------------------- | --------------------------------------------------------------------------------------- |
| **1.1 Non-conflicting concurrent edits** | Client A modifies task-1, Client B modifies task-2. Both merge cleanly.                 |
| **1.2 Conflict detection (same entity)** | Client A and B both edit task-1 without seeing each other's changes. Conflict detected. |
| **1.3 Three-client vector clock merge**  | A -> B -> C chain: verify merged clock contains all three clients' knowledge            |
| **1.4 Fresh client sync**                | New client with empty state receives all remote operations                              |
| **1.5 Stale operation rejection**        | Remote sends operation with older vector clock than local - should be skipped           |
| **1.6 Duplicate operation handling**     | Same operation ID received twice - only stored once                                     |

### Category 2: State Consistency (state-consistency.integration.spec.ts)

| Scenario                                   | Description                                                                        |
| ------------------------------------------ | ---------------------------------------------------------------------------------- |
| **2.1 Full replay produces correct state** | Create -> Update -> Update sequence rebuilds expected state                        |
| **2.2 Snapshot + tail equals full replay** | State from snapshot + tail ops equals state from full replay                       |
| **2.3 Delete operation handling**          | Create -> Delete sequence results in entity not existing                           |
| **2.4 Operation order independence**       | Same ops in different arrival order produce same final state (for non-conflicting) |
| **2.5 Compaction preserves state**         | State after compaction matches state before                                        |

## Implementation Approach

### Phase 1: Test Infrastructure

1. Create `integration/` directory structure
2. Implement `TestClient` helper class
3. Implement operation factory helpers
4. Add state assertion utilities

### Phase 2: Multi-Client Sync Tests

1. Two-client non-conflicting operations
2. Two-client conflict detection
3. Three-client vector clock convergence
4. Fresh client sync scenario

### Phase 3: State Consistency Tests

1. Full operation replay
2. Snapshot + tail replay equivalence
3. Delete operation handling
4. Compaction state preservation

## Test Setup Pattern

```typescript
describe('Multi-Client Sync Integration', () => {
  let storeService: OperationLogStoreService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [OperationLogStoreService, VectorClockService],
    });
    storeService = TestBed.inject(OperationLogStoreService);
    await storeService.init();
    await storeService._clearAllDataForTesting(); // Ensures test isolation
  });

  it('should merge non-conflicting ops from two clients', async () => {
    const clientA = new TestClient('client-a');
    const clientB = new TestClient('client-b');

    const opA = createTaskOperation(clientA, 'task-1', OpType.Create, { title: 'A' });
    const opB = createTaskOperation(clientB, 'task-2', OpType.Create, { title: 'B' });

    await storeService.append(opA, 'local');
    await storeService.append(opB, 'remote');

    const ops = await storeService.getOpsAfterSeq(0);
    expect(ops.length).toBe(2);
  });
});
```

## Critical Files

- `src/app/core/persistence/operation-log/store/operation-log-store.service.ts` - Core storage with `_clearAllDataForTesting()`
- `src/app/core/persistence/operation-log/store/operation-log-store.service.spec.ts` - Pattern to follow (lines 12-24 for `createTestOperation`)
- `src/app/core/persistence/operation-log/operation.types.ts` - Operation, OpType, EntityType types
- `src/app/pfapi/api/util/vector-clock.ts` - `compareVectorClocks`, `mergeVectorClocks` utilities
- `src/app/core/persistence/operation-log/sync/vector-clock.service.ts` - Vector clock management

## Determinism Strategy

1. **Isolated database**: `_clearAllDataForTesting()` before each test
2. **Controlled UUIDs**: Test helper generates predictable IDs (`test-uuid-${counter}`)
3. **Controlled time**: Use `jasmine.clock().mockDate()` for timestamp determinism
4. **Sequential execution**: Integration tests run sequentially (no parallel spec execution)
