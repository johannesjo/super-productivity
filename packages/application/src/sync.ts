import { decrypt, encrypt, mergeVectorClocks, type VectorClock } from '@sp/sync-core';
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

export interface NouraSyncOperationEndpoint {
  upload(operation: EncryptedServerOperation): Promise<{ serverSeq: number }>;
  download(
    sinceSeq: number,
    excludeClient: string,
  ): Promise<{
    operations: EncryptedServerOperation[];
    latestSeq: number;
    hasMore: boolean;
  }>;
  subscribe?(sinceSeq: number, onAvailable: () => void, clientId: string): () => void;
}

export interface RevisionedSyncFileProvider {
  id: string;
  downloadFile(path: string): Promise<{ rev: string; dataStr: string }>;
  uploadFile(
    path: string,
    dataStr: string,
    revToMatch: string | null,
    isForceOverwrite?: boolean,
  ): Promise<{ rev: string }>;
}

interface EncryptedOperationFile {
  version: 1;
  latestSeq: number;
  updatedAt: number;
  operations: EncryptedServerOperation[];
}

export interface FileProviderOperationEndpointOptions {
  provider: RevisionedSyncFileProvider;
  fileName?: string;
  pollIntervalMs?: number;
  maxWriteAttempts?: number;
}

const isProviderError = (error: unknown, name: string): boolean =>
  error instanceof Error && error.name === name;

/**
 * Stores Noura's already-encrypted domain operations in a revisioned JSON file.
 * Dropbox, OneDrive and WebDAV provide atomic revision checks, so a losing writer
 * re-reads and merges before retrying. Local-folder providers offer best-effort
 * revision checks and are intentionally documented as single-writer backup sync.
 */
export class FileProviderOperationEndpoint implements NouraSyncOperationEndpoint {
  readonly #provider: RevisionedSyncFileProvider;
  readonly #fileName: string;
  readonly #pollIntervalMs: number;
  readonly #maxWriteAttempts: number;

  constructor(options: FileProviderOperationEndpointOptions) {
    this.#provider = options.provider;
    this.#fileName = options.fileName ?? 'noura-sync-operations.json';
    this.#pollIntervalMs = options.pollIntervalMs ?? 15_000;
    this.#maxWriteAttempts = options.maxWriteAttempts ?? 6;
  }

  async upload(operation: EncryptedServerOperation): Promise<{ serverSeq: number }> {
    for (let attempt = 0; attempt < this.#maxWriteAttempts; attempt += 1) {
      const current = await this.#read();
      const existing = current.file.operations.find((item) => item.id === operation.id);
      if (existing) return { serverSeq: existing.serverSeq };

      const serverSeq = current.file.latestSeq + 1;
      const next: EncryptedOperationFile = {
        ...current.file,
        latestSeq: serverSeq,
        updatedAt: Date.now(),
        operations: [...current.file.operations, { ...operation, serverSeq }],
      };
      try {
        await this.#provider.uploadFile(
          this.#fileName,
          JSON.stringify(next),
          current.rev,
          false,
        );
        return { serverSeq };
      } catch (error) {
        if (!isProviderError(error, 'UploadRevToMatchMismatchAPIError')) throw error;
        if (attempt === this.#maxWriteAttempts - 1) {
          throw new Error(
            `${this.#provider.id} sync stayed busy after ${this.#maxWriteAttempts} attempts`,
            { cause: error },
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 40 * (attempt + 1)));
      }
    }
    throw new Error(`${this.#provider.id} sync upload failed`);
  }

  async download(
    sinceSeq: number,
    excludeClient: string,
  ): Promise<{
    operations: EncryptedServerOperation[];
    latestSeq: number;
    hasMore: boolean;
  }> {
    const { file } = await this.#read();
    return {
      operations: file.operations.filter(
        (operation) =>
          operation.serverSeq > sinceSeq && operation.clientId !== excludeClient,
      ),
      latestSeq: file.latestSeq,
      hasMore: false,
    };
  }

  subscribe(_sinceSeq: number, onAvailable: () => void): () => void {
    const timer = setInterval(onAvailable, this.#pollIntervalMs);
    return () => clearInterval(timer);
  }

  async #read(): Promise<{ rev: string | null; file: EncryptedOperationFile }> {
    try {
      const remote = await this.#provider.downloadFile(this.#fileName);
      const parsed = JSON.parse(remote.dataStr) as Partial<EncryptedOperationFile>;
      if (
        parsed.version !== 1 ||
        typeof parsed.latestSeq !== 'number' ||
        !Number.isSafeInteger(parsed.latestSeq) ||
        !Array.isArray(parsed.operations)
      ) {
        throw new Error(`${this.#provider.id} contains an unsupported Noura sync file`);
      }
      return {
        rev: remote.rev,
        file: {
          version: 1,
          latestSeq: parsed.latestSeq,
          updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
          operations: parsed.operations,
        },
      };
    } catch (error) {
      if (!isProviderError(error, 'RemoteFileNotFoundAPIError')) throw error;
      return {
        rev: null,
        file: { version: 1, latestSeq: 0, updatedAt: 0, operations: [] },
      };
    }
  }
}

export interface NouraSyncHttpEndpointOptions {
  baseUrl: string;
  accessToken: string;
  fetch?: typeof globalThis.fetch;
}

interface NouraSyncWireOperation {
  id: string;
  clientId: string;
  actionType: string;
  opType: 'CRT' | 'UPD' | 'DEL' | 'MOV';
  entityType: 'TASK' | 'PROJECT' | 'TIME_TRACKING' | 'ALL';
  entityId?: string;
  payload: string;
  vectorClock: VectorClock;
  timestamp: number;
  schemaVersion: 1;
  isPayloadEncrypted: true;
}

interface NouraSyncDownloadResponse {
  ops: Array<{ serverSeq: number; op: NouraSyncWireOperation; receivedAt: number }>;
  latestSeq: number;
  hasMore: boolean;
}

const operationShape = (
  operation: DomainOperation,
): Pick<NouraSyncWireOperation, 'opType' | 'entityType' | 'entityId'> => {
  const id = 'id' in operation.command.payload ? operation.command.payload.id : undefined;
  if (operation.command.type === 'task/add')
    return {
      opType: 'CRT',
      entityType: 'TASK',
      entityId: operation.command.payload.task.id,
    };
  if (operation.command.type === 'task/remove')
    return { opType: 'DEL', entityType: 'TASK', entityId: id };
  if (operation.command.type === 'task/reorder')
    return { opType: 'MOV', entityType: 'TASK' };
  if (operation.command.type.startsWith('task/'))
    return { opType: 'UPD', entityType: 'TASK', entityId: id };
  if (operation.command.type === 'project/add')
    return {
      opType: 'CRT',
      entityType: 'PROJECT',
      entityId: operation.command.payload.project.id,
    };
  if (operation.command.type.startsWith('project/'))
    return { opType: 'UPD', entityType: 'PROJECT', entityId: id };
  if (operation.command.type.startsWith('session/'))
    return {
      opType: operation.command.type === 'session/start' ? 'CRT' : 'UPD',
      entityType: 'TIME_TRACKING',
      entityId:
        id ??
        ('session' in operation.command.payload
          ? operation.command.payload.session.id
          : undefined),
    };
  return { opType: 'UPD', entityType: 'ALL' };
};

export class NouraSyncHttpEndpoint implements NouraSyncOperationEndpoint {
  readonly #baseUrl: string;
  readonly #accessToken: string;
  readonly #fetch: typeof globalThis.fetch;

  constructor(options: NouraSyncHttpEndpointOptions) {
    this.#baseUrl = options.baseUrl.replace(/\/$/, '');
    this.#accessToken = options.accessToken.trim();
    this.#fetch = options.fetch ?? globalThis.fetch;
  }

  async upload(operation: EncryptedServerOperation): Promise<{ serverSeq: number }> {
    const domainOperation = operation.domainOperation;
    const shape = domainOperation
      ? operationShape(domainOperation)
      : { opType: 'UPD' as const, entityType: 'ALL' as const };
    const wireOperation: NouraSyncWireOperation = {
      id: operation.id,
      clientId: operation.clientId,
      actionType: domainOperation?.command.type ?? 'domain/operation',
      ...shape,
      payload: operation.encryptedPayload,
      vectorClock: operation.vectorClock,
      timestamp: operation.timestamp,
      schemaVersion: 1,
      isPayloadEncrypted: true,
    };
    const response = await this.#request<{
      results: Array<{ accepted: boolean; serverSeq?: number; error?: string }>;
      latestSeq: number;
    }>('/api/sync/ops', {
      method: 'POST',
      body: JSON.stringify({
        ops: [wireOperation],
        clientId: operation.clientId,
        lastKnownServerSeq: operation.serverSeq,
        requestId: operation.id.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64),
      }),
    });
    const result = response.results[0];
    if (!result?.accepted)
      throw new Error(result?.error || 'NouraSync rejected the operation');
    return { serverSeq: result.serverSeq ?? response.latestSeq };
  }

  async download(
    sinceSeq: number,
    excludeClient: string,
  ): Promise<{
    operations: EncryptedServerOperation[];
    latestSeq: number;
    hasMore: boolean;
  }> {
    const query = new URLSearchParams({
      sinceSeq: String(sinceSeq),
      excludeClient,
      limit: '500',
    });
    const response = await this.#request<NouraSyncDownloadResponse>(
      `/api/sync/ops?${query.toString()}`,
      { method: 'GET' },
    );
    return {
      operations: response.ops.map(({ serverSeq, op }) => ({
        serverSeq,
        id: op.id,
        clientId: op.clientId,
        timestamp: op.timestamp,
        vectorClock: op.vectorClock,
        encryptedPayload: op.payload,
      })),
      latestSeq: response.latestSeq,
      hasMore: response.hasMore,
    };
  }

  subscribe(_sinceSeq: number, onAvailable: () => void, clientId: string): () => void {
    if (typeof WebSocket === 'undefined') {
      const timer = setInterval(onAvailable, 15_000);
      return () => clearInterval(timer);
    }
    let stopped = false;
    let socket: WebSocket | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const connect = (): void => {
      const webSocketUrl = new URL('/api/sync/ws', this.#baseUrl);
      webSocketUrl.protocol = webSocketUrl.protocol === 'https:' ? 'wss:' : 'ws:';
      webSocketUrl.search = new URLSearchParams({
        token: this.#accessToken,
        clientId,
      }).toString();
      socket = new WebSocket(webSocketUrl);
      socket.addEventListener('message', (event) => {
        try {
          const message = JSON.parse(String(event.data)) as { type?: string };
          if (message.type === 'new_ops') onAvailable();
        } catch {
          // Ignore non-protocol frames; the HTTP sync path remains authoritative.
        }
      });
      socket.addEventListener('close', () => {
        if (!stopped) retryTimer = setTimeout(connect, 5_000);
      });
    };
    connect();
    return () => {
      stopped = true;
      if (retryTimer) clearTimeout(retryTimer);
      socket?.close();
    };
  }

  async #request<T>(path: string, init: RequestInit): Promise<T> {
    if (!this.#accessToken) throw new Error('A NouraSync access token is required');
    const response = await this.#fetch(`${this.#baseUrl}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${this.#accessToken}`,
        'content-type': 'application/json',
        ...init.headers,
      },
    });
    if (!response.ok) throw new Error(`NouraSync request failed (${response.status})`);
    return (await response.json()) as T;
  }
}

export interface SyncCursorRepository {
  load(): Promise<{ serverSeq: number; vectorClock: VectorClock }>;
  save(cursor: { serverSeq: number; vectorClock: VectorClock }): Promise<void>;
}

export class EncryptedOperationTransport implements OperationTransport {
  #listeners = new Set<(operation: DomainOperation) => void | Promise<void>>();
  #syncing?: Promise<void>;
  #stopRealtime?: () => void;

  constructor(
    private readonly endpoint: NouraSyncOperationEndpoint,
    private readonly cursorRepository: SyncCursorRepository,
    private readonly clientId: string,
    private readonly passphrase: string,
  ) {}

  async start(): Promise<void> {
    const cursor = await this.cursorRepository.load();
    this.#stopRealtime = this.endpoint.subscribe?.(
      cursor.serverSeq,
      () => void this.sync(),
      this.clientId,
    );
    await this.sync();
  }

  stop(): void {
    this.#stopRealtime?.();
    this.#stopRealtime = undefined;
  }

  subscribe(
    onOperation: (operation: DomainOperation) => void | Promise<void>,
  ): () => void {
    this.#listeners.add(onOperation);
    return () => this.#listeners.delete(onOperation);
  }

  async push(operation: DomainOperation): Promise<void> {
    const cursor = await this.cursorRepository.load();
    const nextClock = { ...cursor.vectorClock, [this.clientId]: operation.sequence };
    const encryptedPayload = await encrypt(JSON.stringify(operation), this.passphrase);
    await this.endpoint.upload({
      serverSeq: cursor.serverSeq,
      id: operation.id,
      clientId: this.clientId,
      timestamp: operation.timestamp,
      vectorClock: nextClock,
      encryptedPayload,
      domainOperation: operation,
    });
    await this.cursorRepository.save({
      // Upload sequence numbers do not prove that this client downloaded every
      // preceding remote operation. Only the download path advances serverSeq.
      serverSeq: cursor.serverSeq,
      vectorClock: nextClock,
    });
  }

  sync(): Promise<void> {
    this.#syncing ??= this.#drain().finally(() => {
      this.#syncing = undefined;
    });
    return this.#syncing;
  }

  async #drain(): Promise<void> {
    let cursor = await this.cursorRepository.load();
    let hasMore = true;
    while (hasMore) {
      const response = await this.endpoint.download(cursor.serverSeq, this.clientId);
      for (const remote of response.operations) {
        const operation = JSON.parse(
          await decrypt(remote.encryptedPayload, this.passphrase),
        ) as DomainOperation;
        const replay: DomainOperation = { ...operation, source: 'remote' };
        for (const listener of this.#listeners) await listener(replay);
        cursor = {
          serverSeq: Math.max(cursor.serverSeq, remote.serverSeq),
          vectorClock: mergeVectorClocks(cursor.vectorClock, remote.vectorClock),
        };
      }
      cursor = { ...cursor, serverSeq: Math.max(cursor.serverSeq, response.latestSeq) };
      await this.cursorRepository.save(cursor);
      hasMore = response.hasMore;
    }
  }
}

export class MemorySyncCursorRepository implements SyncCursorRepository {
  #cursor = { serverSeq: 0, vectorClock: {} as VectorClock };
  async load(): Promise<{ serverSeq: number; vectorClock: VectorClock }> {
    return structuredClone(this.#cursor);
  }
  async save(cursor: { serverSeq: number; vectorClock: VectorClock }): Promise<void> {
    this.#cursor = structuredClone(cursor);
  }
}
