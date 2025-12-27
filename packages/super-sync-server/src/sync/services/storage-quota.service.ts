/**
 * StorageQuotaService - Handles storage quota calculations and checks
 *
 * Extracted from SyncService for better separation of concerns.
 * This service handles storage usage tracking and quota enforcement.
 *
 * Note: Complex cleanup/freeing operations remain in SyncService as they
 * orchestrate multiple operations including deleting restore points.
 */
import { prisma } from '../../db';

/**
 * Default storage quota per user in bytes (100MB).
 */
const DEFAULT_STORAGE_QUOTA_BYTES = 100 * 1024 * 1024;

export class StorageQuotaService {
  /**
   * Calculate actual storage usage for a user.
   * Includes operations table and snapshot data.
   */
  async calculateStorageUsage(userId: number): Promise<{
    operationsBytes: number;
    snapshotBytes: number;
    totalBytes: number;
  }> {
    // Use raw SQL for efficient aggregation of JSON payload sizes
    const opsResult = await prisma.$queryRaw<[{ total: bigint | null }]>`
      SELECT COALESCE(SUM(LENGTH(payload::text) + LENGTH(vector_clock::text)), 0) as total
      FROM operations WHERE user_id = ${userId}
    `;

    const snapshotResult = await prisma.userSyncState.findUnique({
      where: { userId },
      select: { snapshotData: true },
    });

    const operationsBytes = Number(opsResult[0]?.total ?? 0);
    const snapshotBytes = snapshotResult?.snapshotData?.length ?? 0;

    return {
      operationsBytes,
      snapshotBytes,
      totalBytes: operationsBytes + snapshotBytes,
    };
  }

  /**
   * Check if a user has quota available for additional storage.
   * Uses cached storageUsedBytes for performance.
   */
  async checkStorageQuota(
    userId: number,
    additionalBytes: number,
  ): Promise<{ allowed: boolean; currentUsage: number; quota: number }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { storageQuotaBytes: true, storageUsedBytes: true },
    });

    const quota = Number(user?.storageQuotaBytes ?? DEFAULT_STORAGE_QUOTA_BYTES);
    const currentUsage = Number(user?.storageUsedBytes ?? 0);

    return {
      allowed: currentUsage + additionalBytes <= quota,
      currentUsage,
      quota,
    };
  }

  /**
   * Update the cached storage usage for a user.
   * Called after successful uploads to keep the cache accurate.
   */
  async updateStorageUsage(userId: number): Promise<void> {
    const { totalBytes } = await this.calculateStorageUsage(userId);
    await prisma.user.update({
      where: { id: userId },
      data: { storageUsedBytes: BigInt(totalBytes) },
    });
  }

  /**
   * Get storage quota and usage for a user.
   * Used by status endpoint.
   */
  async getStorageInfo(userId: number): Promise<{
    storageUsedBytes: number;
    storageQuotaBytes: number;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { storageQuotaBytes: true, storageUsedBytes: true },
    });

    return {
      storageUsedBytes: Number(user?.storageUsedBytes ?? 0),
      storageQuotaBytes: Number(user?.storageQuotaBytes ?? DEFAULT_STORAGE_QUOTA_BYTES),
    };
  }
}
