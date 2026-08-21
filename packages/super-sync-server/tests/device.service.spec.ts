import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DeviceService } from '../src/sync/services/device.service';
import {
  DEVICE_TOUCH_THROTTLE_MS,
  ONLINE_DEVICE_THRESHOLD_MS,
} from '../src/sync/sync.types';

// Mock prisma
vi.mock('../src/db', () => ({
  prisma: {
    syncDevice: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    $executeRaw: vi.fn(),
    userSyncState: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '../src/db';

describe('DeviceService', () => {
  let service: DeviceService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DeviceService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('isDeviceOwner', () => {
    it('should return true when device exists for user', async () => {
      vi.mocked(prisma.syncDevice.count).mockResolvedValue(1);

      const result = await service.isDeviceOwner(1, 'client-123');

      expect(result).toBe(true);
      expect(prisma.syncDevice.count).toHaveBeenCalledWith({
        where: { userId: 1, clientId: 'client-123' },
      });
    });

    it('should return false when device does not exist', async () => {
      vi.mocked(prisma.syncDevice.count).mockResolvedValue(0);

      const result = await service.isDeviceOwner(1, 'unknown-client');

      expect(result).toBe(false);
    });

    it('should return true when multiple devices match (edge case)', async () => {
      vi.mocked(prisma.syncDevice.count).mockResolvedValue(2);

      const result = await service.isDeviceOwner(1, 'client-123');

      expect(result).toBe(true);
    });
  });

  describe('getAllUserIds', () => {
    it('should return empty array when no users exist', async () => {
      vi.mocked(prisma.userSyncState.findMany).mockResolvedValue([]);

      const result = await service.getAllUserIds();

      expect(result).toEqual([]);
      expect(prisma.userSyncState.findMany).toHaveBeenCalledWith({
        select: { userId: true },
        distinct: ['userId'],
      });
    });

    it('should return user IDs from sync state', async () => {
      vi.mocked(prisma.userSyncState.findMany).mockResolvedValue([
        { userId: 1 },
        { userId: 2 },
        { userId: 3 },
      ] as any);

      const result = await service.getAllUserIds();

      expect(result).toEqual([1, 2, 3]);
    });

    it('should handle single user', async () => {
      vi.mocked(prisma.userSyncState.findMany).mockResolvedValue([{ userId: 42 }] as any);

      const result = await service.getAllUserIds();

      expect(result).toEqual([42]);
    });
  });

  describe('listDevices', () => {
    it('should map BigInt columns to numbers', async () => {
      vi.mocked(prisma.syncDevice.findMany).mockResolvedValue([
        { clientId: 'E_abc123', lastSeenAt: BigInt(1700000000000) },
      ] as any);

      // BigInt would serialise to a JSON error on the wire, so the mapping to
      // number is the contract this route depends on.
      expect(await service.listDevices(1)).toEqual([
        { clientId: 'E_abc123', lastSeenAt: 1700000000000 },
      ]);
    });
  });

  describe('touchDevice', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(1700000000000);
    });

    it('should skip the database entirely for a device touched within the window', async () => {
      await service.touchDevice(1, 'E_abc123');
      vi.setSystemTime(1700000000000 + DEVICE_TOUCH_THROTTLE_MS - 1);
      await service.touchDevice(1, 'E_abc123');

      // Postgres locks the conflicting row before it evaluates the
      // ON CONFLICT ... WHERE predicate, so even a suppressed update costs a
      // connection, a row lock and a WAL-flushing commit. The in-process
      // throttle is what keeps the common case free.
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it('should hit the database again once the window has passed', async () => {
      await service.touchDevice(1, 'E_abc123');
      vi.setSystemTime(1700000000000 + DEVICE_TOUCH_THROTTLE_MS);
      await service.touchDevice(1, 'E_abc123');

      expect(prisma.$executeRaw).toHaveBeenCalledTimes(2);
    });

    it('should throttle per device and per account, not globally', async () => {
      await service.touchDevice(1, 'E_abc123');
      await service.touchDevice(1, 'A_xyz789');
      await service.touchDevice(2, 'E_abc123');

      expect(prisma.$executeRaw).toHaveBeenCalledTimes(3);
    });
  });

  describe('getOnlineDeviceCount', () => {
    it('should return count of online devices', async () => {
      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      vi.mocked(prisma.syncDevice.count).mockResolvedValue(3);

      const result = await service.getOnlineDeviceCount(1);

      expect(result).toBe(3);
      expect(prisma.syncDevice.count).toHaveBeenCalledWith({
        where: {
          userId: 1,
          lastSeenAt: { gt: BigInt(now - ONLINE_DEVICE_THRESHOLD_MS) },
        },
      });
    });

    it('should return zero when no online devices', async () => {
      vi.mocked(prisma.syncDevice.count).mockResolvedValue(0);

      const result = await service.getOnlineDeviceCount(1);

      expect(result).toBe(0);
    });

    it('should calculate threshold correctly', async () => {
      vi.useFakeTimers();
      const now = 1700000000000; // Fixed timestamp
      vi.setSystemTime(now);

      vi.mocked(prisma.syncDevice.count).mockResolvedValue(1);

      await service.getOnlineDeviceCount(1);

      const expectedThreshold = BigInt(now - ONLINE_DEVICE_THRESHOLD_MS);
      expect(prisma.syncDevice.count).toHaveBeenCalledWith({
        where: {
          userId: 1,
          lastSeenAt: { gt: expectedThreshold },
        },
      });
    });
  });
});
