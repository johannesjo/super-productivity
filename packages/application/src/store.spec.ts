import { describe, expect, it } from 'vitest';
import type { DomainOperation } from '@noura/domain';
import { DomainStore, MemoryStateRepository } from './index';

describe('DomainStore', () => {
  it('persists one operation and only pushes local intent', async () => {
    const pushed: string[] = [];
    const store = new DomainStore(new MemoryStateRepository(), 'client', {
      push: async (op) => {
        pushed.push(op.id);
      },
      subscribe: () => () => undefined,
    });
    await store.execute(
      { type: 'task/select', payload: { id: undefined } },
      { operationId: 'local-op' },
    );
    await store.execute(
      { type: 'task/select', payload: { id: undefined } },
      { source: 'remote', operationId: 'remote-op' },
    );
    expect(pushed).toEqual(['local-op']);
  });

  it('lets transports await durable application of remote operations', async () => {
    let receive: ((operation: DomainOperation) => void | Promise<void>) | undefined;
    const repository = new MemoryStateRepository();
    const store = new DomainStore(repository, 'local-client', {
      push: async () => undefined,
      subscribe: (listener) => {
        receive = listener;
        return () => undefined;
      },
    });
    await store.hydrate();
    const remote: DomainOperation = {
      id: 'remote-op',
      clientId: 'remote-client',
      sequence: 1,
      timestamp: 10,
      command: { type: 'task/select', payload: { id: 'remote-task' } },
      source: 'remote',
    };

    await receive?.(remote);

    expect((await repository.load()).selectedTaskId).toBe('remote-task');
  });
});
