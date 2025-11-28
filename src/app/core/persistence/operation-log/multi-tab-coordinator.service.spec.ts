import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { MultiTabCoordinatorService } from './multi-tab-coordinator.service';
import { Operation } from './operation.types';
import { PersistentAction } from './persistent-action.interface';

describe('MultiTabCoordinatorService', () => {
  let service: MultiTabCoordinatorService;
  let mockStore: jasmine.SpyObj<Store>;
  let mockBroadcastChannel: BroadcastChannel;

  // Mock BroadcastChannel since it's not available in test environment sometimes
  class MockBroadcastChannel {
    name: string;
    onmessage: ((this: BroadcastChannel, ev: MessageEvent) => any) | null = null;
    constructor(name: string) {
      this.name = name;
    }
    postMessage(message: any): void {}
    close(): void {}
  }

  beforeEach(() => {
    mockStore = jasmine.createSpyObj('Store', ['dispatch']);

    // Spy on window.BroadcastChannel to return our mock
    spyOn(window as any, 'BroadcastChannel').and.callFake((name: string) => {
      mockBroadcastChannel = new MockBroadcastChannel(name) as any;
      return mockBroadcastChannel;
    });

    TestBed.configureTestingModule({
      providers: [MultiTabCoordinatorService, { provide: Store, useValue: mockStore }],
    });
    service = TestBed.inject(MultiTabCoordinatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should broadcast new operations', () => {
    const op: Operation = {
      id: 'test-op',
      actionType: '[Test] Action',
      opType: 'CRT' as any,
      entityType: 'TASK',
      entityId: 'task-1',
      payload: { foo: 'bar' },
      clientId: 'client-1',
      // eslint-disable-next-line @typescript-eslint/naming-convention
      vectorClock: { 'client-1': 1 },
      timestamp: 123,
      schemaVersion: 1,
    };

    spyOn(mockBroadcastChannel, 'postMessage');
    service.notifyNewOperation(op);

    expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith({
      type: 'NEW_OP',
      op,
    });
  });

  it('should dispatch action when receiving message from other tab', () => {
    const op: Operation = {
      id: 'remote-op',
      actionType: '[Test] Remote Action',
      opType: 'UPD' as any,
      entityType: 'TASK',
      entityId: 'task-1',
      payload: { title: 'New Title' },
      clientId: 'client-2',
      // eslint-disable-next-line @typescript-eslint/naming-convention
      vectorClock: { 'client-2': 1 },
      timestamp: 123,
      schemaVersion: 1,
    };

    // Simulate incoming message
    const event = new MessageEvent('message', {
      data: { type: 'NEW_OP', op },
    });

    if (mockBroadcastChannel.onmessage) {
      mockBroadcastChannel.onmessage(event);
    } else {
      fail('onmessage handler not set');
    }

    expect(mockStore.dispatch).toHaveBeenCalled();
    const dispatchedAction = mockStore.dispatch.calls.mostRecent()
      .args[0] as PersistentAction;

    expect(dispatchedAction.type).toBe('[Test] Remote Action');
    expect(dispatchedAction['title']).toBe('New Title'); // Payload merged
    expect(dispatchedAction.meta.isRemote).toBeTrue();
    expect(dispatchedAction.meta.entityId).toBe('task-1');
  });
});
