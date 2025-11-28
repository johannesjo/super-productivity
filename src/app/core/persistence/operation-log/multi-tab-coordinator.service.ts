import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Operation } from './operation.types';
import { convertOpToAction } from './operation-converter.util';

/**
 * Coordinates multi-tab synchronization using the BroadcastChannel API.
 * When an operation is written to the log in one tab, this service broadcasts it.
 * Other tabs receive the operation, convert it back to an action, and dispatch it
 * to their local NgRx store to stay in sync without a full reload.
 */
@Injectable({ providedIn: 'root' })
export class MultiTabCoordinatorService {
  private readonly CHANNEL_NAME = 'sp_op_log';
  private broadcastChannel: BroadcastChannel;
  private store = inject(Store);

  constructor() {
    this.broadcastChannel = new BroadcastChannel(this.CHANNEL_NAME);
    this.broadcastChannel.onmessage = (event) => {
      if (event.data && event.data.type === 'NEW_OP' && event.data.op) {
        this.handleRemoteTabOp(event.data.op);
      }
    };
  }

  /**
   * Notify other tabs about a new operation.
   */
  notifyNewOperation(op: Operation): void {
    this.broadcastChannel.postMessage({ type: 'NEW_OP', op });
  }

  /**
   * Handle an operation received from another tab.
   */
  private handleRemoteTabOp(op: Operation): void {
    const action = convertOpToAction(op);
    // Dispatching with meta.isRemote = true prevents this tab from re-persisting/re-broadcasting it
    this.store.dispatch(action);
  }
}
