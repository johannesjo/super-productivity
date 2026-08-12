import { createInitialState, reduceDomain, } from '@noura/domain';
export * from './sync';
export * from './backup';
export * from './capture';
export * from './md';
export * from './eisenhower';
export * from './worklog';
export * from './metrics';
export * from './planner';
export * from './calendar';
export * from './i18n';
export { localeCodes } from './locales';
export * from './local-http';
export * from './services/ports';
export * from './services/reminder-scheduler';
export * from './services/tracking-reminder';
export * from './services/take-a-break';
export * from './services/idle';
export * from './services/search';
export * from './services/notifications';
export * from './services/shortcuts';
export * from './effects/daily';
export * from './effects/focus';
export class DomainStore {
    repository;
    clientId;
    transport;
    #state;
    #listeners = new Set();
    #sequence = 0;
    #transportSubscription;
    constructor(repository, clientId, transport, initialState = createInitialState()) {
        this.repository = repository;
        this.clientId = clientId;
        this.transport = transport;
        this.#state = initialState;
    }
    getState = () => this.#state;
    subscribe = (listener) => {
        this.#listeners.add(listener);
        listener(this.#state);
        return () => this.#listeners.delete(listener);
    };
    async hydrate() {
        const persisted = await this.repository.load();
        if (persisted)
            this.#replace(persisted);
        this.connectTransport(this.transport);
    }
    connectTransport(transport) {
        this.#transportSubscription?.();
        this.transport = transport;
        this.#transportSubscription = transport?.subscribe((operation) => this.apply(operation));
    }
    async execute(command, options = {}) {
        const source = options.source ?? 'local';
        const timestamp = options.timestamp ?? Date.now();
        const operation = {
            id: options.operationId ?? crypto.randomUUID(),
            clientId: this.clientId,
            sequence: options.sequence ?? ++this.#sequence,
            timestamp,
            command,
            source,
        };
        this.#replace(reduceDomain(this.#state, command));
        await this.repository.save(this.#state, operation);
        if (source === 'local')
            await this.transport?.push(operation);
        return operation;
    }
    async apply(operation) {
        await this.execute(operation.command, {
            source: operation.source === 'local' ? 'remote' : operation.source,
            operationId: operation.id,
            timestamp: operation.timestamp,
            sequence: operation.sequence,
        });
    }
    async import(state) {
        await this.repository.import(state);
        this.#replace(state);
    }
    export() {
        return this.repository.export();
    }
    #replace(state) {
        this.#state = state;
        for (const listener of this.#listeners)
            listener(state);
    }
}
export class MemoryStateRepository {
    state;
    constructor(state = createInitialState()) {
        this.state = state;
    }
    async load() {
        return structuredClone(this.state);
    }
    async save(state) {
        this.state = structuredClone(state);
    }
    async import(state) {
        this.state = structuredClone(state);
    }
    async export() {
        return structuredClone(this.state);
    }
}
