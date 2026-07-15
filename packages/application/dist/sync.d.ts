import { type VectorClock } from '@sp/sync-core';
import type { DomainOperation } from '@noura/domain';
import type { OperationTransport } from './index';
export interface EncryptedServerOperation {
    serverSeq: number;
    id: string;
    clientId: string;
    timestamp: number;
    vectorClock: VectorClock;
    encryptedPayload: string;
    domainOperation?: DomainOperation;
}
export interface SuperSyncOperationEndpoint {
    upload(operation: EncryptedServerOperation): Promise<{
        serverSeq: number;
    }>;
    download(sinceSeq: number, excludeClient: string): Promise<{
        operations: EncryptedServerOperation[];
        latestSeq: number;
        hasMore: boolean;
    }>;
    subscribe?(sinceSeq: number, onAvailable: () => void, clientId: string): () => void;
}
export interface SuperSyncHttpEndpointOptions {
    baseUrl: string;
    accessToken: string;
    fetch?: typeof globalThis.fetch;
}
export declare class SuperSyncHttpEndpoint implements SuperSyncOperationEndpoint {
    #private;
    constructor(options: SuperSyncHttpEndpointOptions);
    upload(operation: EncryptedServerOperation): Promise<{
        serverSeq: number;
    }>;
    download(sinceSeq: number, excludeClient: string): Promise<{
        operations: EncryptedServerOperation[];
        latestSeq: number;
        hasMore: boolean;
    }>;
    subscribe(_sinceSeq: number, onAvailable: () => void, clientId: string): () => void;
}
export interface SyncCursorRepository {
    load(): Promise<{
        serverSeq: number;
        vectorClock: VectorClock;
    }>;
    save(cursor: {
        serverSeq: number;
        vectorClock: VectorClock;
    }): Promise<void>;
}
export declare class EncryptedOperationTransport implements OperationTransport {
    #private;
    private readonly endpoint;
    private readonly cursorRepository;
    private readonly clientId;
    private readonly passphrase;
    constructor(endpoint: SuperSyncOperationEndpoint, cursorRepository: SyncCursorRepository, clientId: string, passphrase: string);
    start(): Promise<void>;
    stop(): void;
    subscribe(onOperation: (operation: DomainOperation) => void | Promise<void>): () => void;
    push(operation: DomainOperation): Promise<void>;
    sync(): Promise<void>;
}
export declare class MemorySyncCursorRepository implements SyncCursorRepository {
    #private;
    load(): Promise<{
        serverSeq: number;
        vectorClock: VectorClock;
    }>;
    save(cursor: {
        serverSeq: number;
        vectorClock: VectorClock;
    }): Promise<void>;
}
