import {
  createInitialState,
  reduceDomain,
  type DomainCommand,
  type DomainOperation,
  type DomainState,
} from '@noura/domain';

export * from './sync';

export interface StateRepository {
  load(): Promise<DomainState | undefined>;
  save(state: DomainState, operation: DomainOperation): Promise<void>;
  import(state: DomainState): Promise<void>;
  export(): Promise<DomainState>;
}

export interface OperationTransport {
  push(operation: DomainOperation): Promise<void>;
  subscribe(
    onOperation: (operation: DomainOperation) => void | Promise<void>,
  ): () => void;
}

export interface ExecuteOptions {
  source?: DomainOperation['source'];
  operationId?: string;
  timestamp?: number;
  sequence?: number;
}

export class DomainStore {
  #state: DomainState;
  #listeners = new Set<(state: DomainState) => void>();
  #sequence = 0;
  #transportSubscription?: () => void;

  constructor(
    private readonly repository: StateRepository,
    private readonly clientId: string,
    private transport?: OperationTransport,
    initialState: DomainState = createInitialState(),
  ) {
    this.#state = initialState;
  }

  getState = (): DomainState => this.#state;

  subscribe = (listener: (state: DomainState) => void): (() => void) => {
    this.#listeners.add(listener);
    listener(this.#state);
    return () => this.#listeners.delete(listener);
  };

  async hydrate(): Promise<void> {
    const persisted = await this.repository.load();
    if (persisted) this.#replace(persisted);
    this.connectTransport(this.transport);
  }

  connectTransport(transport?: OperationTransport): void {
    this.#transportSubscription?.();
    this.transport = transport;
    this.#transportSubscription = transport?.subscribe((operation) =>
      this.apply(operation),
    );
  }

  async execute(
    command: DomainCommand,
    options: ExecuteOptions = {},
  ): Promise<DomainOperation> {
    const source = options.source ?? 'local';
    const timestamp = options.timestamp ?? Date.now();
    const operation: DomainOperation = {
      id: options.operationId ?? crypto.randomUUID(),
      clientId: this.clientId,
      sequence: options.sequence ?? ++this.#sequence,
      timestamp,
      command,
      source,
    };
    this.#replace(reduceDomain(this.#state, command));
    await this.repository.save(this.#state, operation);
    if (source === 'local') await this.transport?.push(operation);
    return operation;
  }

  async apply(operation: DomainOperation): Promise<void> {
    await this.execute(operation.command, {
      source: operation.source === 'local' ? 'remote' : operation.source,
      operationId: operation.id,
      timestamp: operation.timestamp,
      sequence: operation.sequence,
    });
  }

  async import(state: DomainState): Promise<void> {
    await this.repository.import(state);
    this.#replace(state);
  }

  export(): Promise<DomainState> {
    return this.repository.export();
  }

  #replace(state: DomainState): void {
    this.#state = state;
    for (const listener of this.#listeners) listener(state);
  }
}

export class MemoryStateRepository implements StateRepository {
  constructor(private state: DomainState = createInitialState()) {}
  async load(): Promise<DomainState> {
    return structuredClone(this.state);
  }
  async save(state: DomainState): Promise<void> {
    this.state = structuredClone(state);
  }
  async import(state: DomainState): Promise<void> {
    this.state = structuredClone(state);
  }
  async export(): Promise<DomainState> {
    return structuredClone(this.state);
  }
}
