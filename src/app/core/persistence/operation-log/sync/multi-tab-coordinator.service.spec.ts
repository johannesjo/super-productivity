import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { MultiTabCoordinatorService } from './multi-tab-coordinator.service';
import { Operation } from '../operation.types';
import { PersistentAction } from '../persistent-action.interface';

// Mock BroadcastChannel class that can be used with `new`
class MockBroadcastChannel {
  static instance: MockBroadcastChannel | null = null;
  name: string;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  postMessage = jasmine.createSpy('postMessage');
  close = jasmine.createSpy('close');

  constructor(name: string) {
    this.name = name;
    MockBroadcastChannel.instance = this;
  }
}

describe('MultiTabCoordinatorService', () => {
  let service: MultiTabCoordinatorService;
  let mockStore: jasmine.SpyObj<Store>;
  let originalBroadcastChannel: typeof BroadcastChannel;

  beforeEach(() => {
    mockStore = jasmine.createSpyObj('Store', ['dispatch']);

    // Reset the static instance
    MockBroadcastChannel.instance = null;

    // Save original BroadcastChannel
    originalBroadcastChannel = window.BroadcastChannel;

    // Replace BroadcastChannel with our mock class
    (window as any).BroadcastChannel = MockBroadcastChannel;

    TestBed.configureTestingModule({
      providers: [MultiTabCoordinatorService, { provide: Store, useValue: mockStore }],
    });
    service = TestBed.inject(MultiTabCoordinatorService);
  });

  afterEach(() => {
    // Restore original BroadcastChannel
    window.BroadcastChannel = originalBroadcastChannel;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  xit('should broadcast new operations', () => {
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

    service.notifyNewOperation(op);

    const mockChannel = MockBroadcastChannel.instance!;
    expect(mockChannel.postMessage).toHaveBeenCalledWith({
      type: 'NEW_OP',
      op,
    });
  });

  xit('should dispatch action when receiving message from other tab', () => {
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

    const mockChannel = MockBroadcastChannel.instance!;
    if (mockChannel.onmessage) {
      mockChannel.onmessage(event);
    } else {
      fail('onmessage handler not set');
    }

    expect(mockStore.dispatch).toHaveBeenCalled();
    const dispatchedAction = mockStore.dispatch.calls.mostRecent()
      .args[0] as unknown as PersistentAction;

    expect(dispatchedAction.type).toBe('[Test] Remote Action');
    expect(dispatchedAction['title']).toBe('New Title'); // Payload merged
    expect(dispatchedAction.meta.isRemote).toBeTrue();
    expect(dispatchedAction.meta.entityId).toBe('task-1');
  });
});
