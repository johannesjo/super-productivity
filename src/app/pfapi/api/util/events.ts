import { PfapiEvents } from '../pfapi.model';

type EventHandler<T = any> = (data: T) => void;

export class PFEventEmitter {
  private events: Record<PfapiEvents, EventHandler[]> = {
    syncDone: [],
    syncStart: [],
    syncError: [],
    metaModelChange: [],
  };

  // Subscribe to an event
  on<T>(event: PfapiEvents, handler: EventHandler<T>): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(handler as EventHandler);
  }

  // Unsubscribe from an event
  off<T>(event: PfapiEvents, handler: EventHandler<T>): void {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter((h) => h !== handler);
  }

  // Emit an event
  emit<T>(event: PfapiEvents, data?: T): void {
    if (!this.events[event]) return;
    this.events[event].forEach((handler) => handler(data));
  }
  // Aliases for RxJS compatibility
  addEventListener<T>(event: PfapiEvents, handler: EventHandler<T>): void {
    this.on(event, handler);
  }

  removeEventListener<T>(event: PfapiEvents, handler: EventHandler<T>): void {
    this.off(event, handler);
  }
}
