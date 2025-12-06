import {
  SyncOperation,
  ServerSyncOperation,
  OpUploadResponse,
  OpDownloadResponse,
  OpUploadResult,
} from '../../../../../pfapi/api/sync/sync-provider.interface';

/**
 * Simulates a sync server for integration testing.
 *
 * Stores operations in memory and provides upload/download APIs
 * matching the OperationSyncCapable interface.
 */
export class MockSyncServer {
  private ops: ServerSyncOperation[] = [];
  private nextSeq = 1;

  /**
   * Upload operations to the mock server.
   * Mimics the behavior of the real sync server.
   */
  uploadOps(
    ops: SyncOperation[],
    clientId: string,
    lastKnownServerSeq?: number,
  ): OpUploadResponse {
    const results: OpUploadResult[] = [];

    for (const op of ops) {
      // Check for duplicates
      const isDuplicate = this.ops.some((stored) => stored.op.id === op.id);
      if (isDuplicate) {
        results.push({
          opId: op.id,
          accepted: false,
          error: 'Duplicate operation',
        });
        continue;
      }

      // Accept the operation
      const serverSeq = this.nextSeq++;
      this.ops.push({
        serverSeq,
        op,
        receivedAt: Date.now(),
      });

      results.push({
        opId: op.id,
        accepted: true,
        serverSeq,
      });
    }

    // Piggyback new ops if requested
    let newOps: ServerSyncOperation[] | undefined;
    if (lastKnownServerSeq !== undefined) {
      newOps = this.ops.filter(
        (stored) =>
          stored.serverSeq > lastKnownServerSeq && stored.op.clientId !== clientId,
      );
    }

    return {
      results,
      newOps: newOps && newOps.length > 0 ? newOps : undefined,
      latestSeq: this.getLatestSeq(),
    };
  }

  /**
   * Download operations from the mock server.
   */
  downloadOps(
    sinceSeq: number,
    excludeClient?: string,
    limit: number = 500,
  ): OpDownloadResponse {
    let filtered = this.ops.filter((stored) => stored.serverSeq > sinceSeq);

    if (excludeClient) {
      filtered = filtered.filter((stored) => stored.op.clientId !== excludeClient);
    }

    const hasMore = filtered.length > limit;
    const ops = filtered.slice(0, limit);

    return {
      ops,
      hasMore,
      latestSeq: this.getLatestSeq(),
    };
  }

  /**
   * Get the latest server sequence number.
   */
  getLatestSeq(): number {
    if (this.ops.length === 0) return 0;
    return Math.max(...this.ops.map((o) => o.serverSeq));
  }

  /**
   * Get all stored operations (for assertions).
   */
  getAllOps(): ServerSyncOperation[] {
    return [...this.ops];
  }

  /**
   * Get operations for a specific entity (for assertions).
   */
  getOpsForEntity(entityType: string, entityId: string): ServerSyncOperation[] {
    return this.ops.filter(
      (stored) => stored.op.entityType === entityType && stored.op.entityId === entityId,
    );
  }

  /**
   * Clear all stored data (for test isolation).
   */
  clear(): void {
    this.ops = [];
    this.nextSeq = 1;
  }
}
