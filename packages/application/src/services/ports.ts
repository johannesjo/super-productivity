import type { DomainCommand, DomainState } from '@noura/domain';

/**
 * Framework-neutral service ports. Concrete implementations are injected so
 * services stay deterministic, offline-first, and testable with fakes.
 */

export interface ClockPort {
  now(): number;
  today(): string;
}

/** Runs a produced background action without coupling the effect to the store. */
export interface CommandGateway {
  execute(command: DomainCommand): Promise<void> | void;
}

export interface NotificationPort {
  requestPermission(): Promise<boolean>;
  notify(title: string, body: string): Promise<void>;
}

export interface ShortcutPort {
  register(accelerator: string, handler: () => void | Promise<void>): Promise<() => void>;
}

/** Supply of current idle state; the service decides when idle means "break". */
export interface IdlePort {
  /** Milliseconds the user has been idle at the moment of the poll. */
  getIdleMs(): Promise<number> | number;
}

export interface ActivityBus {
  /** Emitted when a tracked entry should be suspended (fixed end). */
  onSuspend(handler: (entryId: string, suspendedAt: number) => void): () => void;
  /** Emitted when a tracked entry resumes (fixed start). */
  onResume(handler: (entryId: string, resumedAt: number) => void): () => void;
}

export interface StorePort {
  getState(): DomainState;
  execute(command: DomainCommand): Promise<void>;
}

/** Snapshot of the current focus/tracking pulse for reminder-style services. */
export interface FocusPulse {
  /** Current active tracked entry; undefined when none is running. */
  activeEntryId?: string;
  /** When the active entry started (ms epoch). */
  startedAt?: number;
}
