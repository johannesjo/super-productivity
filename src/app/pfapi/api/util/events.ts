import { PfapiEvents, PfapiEventPayloadMap } from '../pfapi.model';
import { pfLog } from './log';

type EventHandler<T> = (data: T) => void;

export class PFEventEmitter {
  // Explicitly initialize with the correct structure
  private events: {
    [K in PfapiEvents]: Array<EventHandler<PfapiEventPayloadMap[K]>>;
  } = {
    syncDone: [],
    syncStart: [],
    syncError: [],
    syncStatusChange: [],
    metaModelChange: [],
    providerChange: [],
    providerReady: [],
    providerPrivateCfgChange: [],
  };

  on<K extends PfapiEvents>(
    event: K,
    handler: EventHandler<PfapiEventPayloadMap[K]>,
  ): void {
    this.events[event].push(handler);
  }

  off<K extends PfapiEvents>(
    event: K,
    handler: EventHandler<PfapiEventPayloadMap[K]>,
  ): void {
    this.events[event] = this.events[event].filter((h) => h !== handler) as any;
  }

  emit<K extends PfapiEvents>(event: K, data: PfapiEventPayloadMap[K]): void {
    pfLog(2, `EV:${event}`, data, this.events);
    this.events[event].forEach((handler) => handler(data));
  }

  // Aliases for RxJS compatibility
  addEventListener<K extends PfapiEvents>(
    event: K,
    handler: EventHandler<PfapiEventPayloadMap[K]>,
  ): void {
    this.on(event, handler);
  }

  removeEventListener<K extends PfapiEvents>(
    event: K,
    handler: EventHandler<PfapiEventPayloadMap[K]>,
  ): void {
    this.off(event, handler);
  }
}
