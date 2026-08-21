/**
 * DeviceService - Handles device-related queries
 *
 * Extracted from SyncService for better separation of concerns.
 * This service handles device ownership and online status queries.
 */
import { prisma } from '../../db';
import {
  DEVICE_TOUCH_THROTTLE_MS,
  ONLINE_DEVICE_THRESHOLD_MS,
  SyncDeviceInfo,
} from '../sync.types';

/** Upper bound on rows `listDevices` returns, and so on the dialog's row count. */
const MAX_LISTED_DEVICES = 100;

/** Size at which `touchDevice`'s throttle map sweeps its expired entries. */
const MAX_TRACKED_TOUCHES = 10_000;

export class DeviceService {
  /** `userId:clientId` -> last touch (ms), so a fresh row costs no DB round trip. */
  private readonly _recentTouches = new Map<string, number>();

  /**
   * Check if a device (identified by clientId) belongs to a user.
   */
  async isDeviceOwner(userId: number, clientId: string): Promise<boolean> {
    const count = await prisma.syncDevice.count({
      where: { userId, clientId },
    });
    return count > 0;
  }

  /**
   * Get all user IDs that have sync state.
   * Used for batch operations like cleanup.
   */
  async getAllUserIds(): Promise<number[]> {
    const users = await prisma.userSyncState.findMany({
      select: { userId: true },
      distinct: ['userId'],
    });
    return users.map((u) => u.userId);
  }

  /**
   * Get count of devices that have been seen recently for a user.
   * A device is considered "online" if it was seen within the threshold.
   */
  async getOnlineDeviceCount(userId: number): Promise<number> {
    const threshold = Date.now() - ONLINE_DEVICE_THRESHOLD_MS;
    const count = await prisma.syncDevice.count({
      where: {
        userId,
        lastSeenAt: { gt: BigInt(threshold) },
      },
    });
    return count;
  }

  /**
   * List the devices that have synced with this account, newest activity first.
   *
   * Deliberately exposes no device name or user agent: the two nullable columns
   * for those are never written, and harvesting a hostname would put the first
   * user-identifying cleartext beyond the account email on a server whose whole
   * point is that op payloads are opaque to it. The clientId's platform prefix
   * (E/A/I/B) is enough to tell devices apart.
   *
   * Capped: stale rows are dropped by the daily cleanup job, but a clientId
   * rotates on clean-slate/backup-restore, so an account can accumulate rows
   * within the retention window faster than the job removes them.
   */
  async listDevices(userId: number): Promise<SyncDeviceInfo[]> {
    const rows = await prisma.syncDevice.findMany({
      where: { userId },
      select: { clientId: true, lastSeenAt: true },
      orderBy: { lastSeenAt: 'desc' },
      take: MAX_LISTED_DEVICES,
    });
    return rows.map((r) => ({
      clientId: r.clientId,
      lastSeenAt: Number(r.lastSeenAt),
    }));
  }

  /**
   * Record that `clientId` is alive, for the device list.
   *
   * Runs on every download, i.e. on every sync poll, so it is throttled twice.
   * The in-process map short-circuits the common case to zero database work:
   * Postgres evaluates `ON CONFLICT ... DO UPDATE ... WHERE` only *after*
   * locking the conflicting row, so even a suppressed update still costs a
   * connection, a row lock, a WAL record and a commit flush. The SQL predicate
   * stays as the backstop that keeps the throttle correct across instances and
   * restarts, where the map cannot see peers.
   *
   * The INSERT half registers download-only devices, which the upload
   * transaction's upsert would otherwise never create.
   */
  async touchDevice(userId: number, clientId: string): Promise<void> {
    const now = Date.now();
    const key = `${userId}:${clientId}`;
    const lastTouch = this._recentTouches.get(key);
    if (lastTouch !== undefined && now - lastTouch < DEVICE_TOUCH_THROTTLE_MS) {
      return;
    }
    this._pruneRecentTouches(now);
    this._recentTouches.set(key, now);

    const nowBig = BigInt(now);
    const staleBefore = nowBig - BigInt(DEVICE_TOUCH_THROTTLE_MS);
    await prisma.$executeRaw`
      INSERT INTO sync_devices (client_id, user_id, last_seen_at, last_acked_seq, created_at)
      VALUES (${clientId}, ${userId}, ${nowBig}::bigint, 0, ${nowBig}::bigint)
      ON CONFLICT (user_id, client_id) DO UPDATE
      SET last_seen_at = EXCLUDED.last_seen_at
      WHERE sync_devices.last_seen_at < ${staleBefore}::bigint
    `;
  }

  /** Drops entries the throttle can no longer suppress, so the map stays bounded. */
  private _pruneRecentTouches(now: number): void {
    if (this._recentTouches.size < MAX_TRACKED_TOUCHES) {
      return;
    }
    for (const [key, at] of this._recentTouches) {
      if (now - at >= DEVICE_TOUCH_THROTTLE_MS) {
        this._recentTouches.delete(key);
      }
    }
    // Every entry was still inside the window, so the sweep freed nothing and
    // would run again — an O(size) scan per request — while the map kept
    // growing. Drop the lot instead: the SQL predicate is what makes the
    // throttle correct, so the only cost is one round trip per device for one
    // window.
    if (this._recentTouches.size >= MAX_TRACKED_TOUCHES) {
      this._recentTouches.clear();
    }
  }

  async deleteStaleDevices(beforeTime: number): Promise<number> {
    const result = await prisma.syncDevice.deleteMany({
      where: {
        lastSeenAt: { lt: BigInt(beforeTime) },
      },
    });
    return result.count;
  }
}
