import { type DomainCommand, type DomainOperation, type DomainState } from '@noura/domain';
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
export interface StateRepository {
    load(): Promise<DomainState | undefined>;
    save(state: DomainState, operation: DomainOperation): Promise<void>;
    import(state: DomainState): Promise<void>;
    export(): Promise<DomainState>;
}
export interface OperationTransport {
    push(operation: DomainOperation): Promise<void>;
    subscribe(onOperation: (operation: DomainOperation) => void | Promise<void>): () => void;
}
export interface ExecuteOptions {
    source?: DomainOperation['source'];
    operationId?: string;
    timestamp?: number;
    sequence?: number;
}
export declare class DomainStore {
    #private;
    private readonly repository;
    private readonly clientId;
    private transport?;
    constructor(repository: StateRepository, clientId: string, transport?: OperationTransport | undefined, initialState?: DomainState);
    getState: () => DomainState;
    subscribe: (listener: (state: DomainState) => void) => (() => void);
    hydrate(): Promise<void>;
    connectTransport(transport?: OperationTransport): void;
    execute(command: DomainCommand, options?: ExecuteOptions): Promise<DomainOperation>;
    apply(operation: DomainOperation): Promise<void>;
    import(state: DomainState): Promise<void>;
    export(): Promise<DomainState>;
}
export declare class MemoryStateRepository implements StateRepository {
    private state;
    constructor(state?: DomainState);
    load(): Promise<DomainState>;
    save(state: DomainState): Promise<void>;
    import(state: DomainState): Promise<void>;
    export(): Promise<DomainState>;
}
