import { getSyncService } from './sync.service';
import { Logger } from '../logger';
import {
  DEFAULT_SYNC_CONFIG,
  STALE_DEVICE_THRESHOLD_MS,
  MS_PER_HOUR,
  MS_PER_DAY,
} from './sync.types';

interface CleanupJob {
  name: string;
  interval: number;
  run: () => Promise<number> | number;
}

const CLEANUP_JOBS: CleanupJob[] = [
  {
    name: 'tombstones',
    interval: MS_PER_DAY,
    run: () => getSyncService().deleteExpiredTombstones(),
  },
  {
    name: 'old-ops',
    interval: MS_PER_DAY,
    run: () => {
      const cutoffTime = Date.now() - DEFAULT_SYNC_CONFIG.opRetentionMs;
      return getSyncService().deleteOldSyncedOpsForAllUsers(cutoffTime);
    },
  },
  {
    name: 'stale-devices',
    interval: MS_PER_HOUR,
    run: () => {
      const staleThreshold = Date.now() - STALE_DEVICE_THRESHOLD_MS;
      return getSyncService().deleteStaleDevices(staleThreshold);
    },
  },
  {
    name: 'rate-limits',
    interval: MS_PER_HOUR,
    run: () => getSyncService().cleanupExpiredRateLimitCounters(),
  },
  {
    name: 'request-dedup',
    interval: MS_PER_HOUR,
    run: () => getSyncService().cleanupExpiredRequestDedupEntries(),
  },
];

const timers: Map<string, NodeJS.Timeout> = new Map();

const runJob = async (job: CleanupJob): Promise<void> => {
  try {
    const deleted = await job.run();
    if (deleted > 0) {
      Logger.info(`Cleanup [${job.name}]: removed ${deleted} entries`);
    }
  } catch (error) {
    Logger.error(`Cleanup [${job.name}] failed: ${error}`);
  }
};

export const startCleanupJobs = (): void => {
  Logger.info('Starting sync cleanup jobs...');

  // Run initial cleanup after a short delay
  setTimeout(() => {
    for (const job of CLEANUP_JOBS) {
      void runJob(job);
    }
  }, 10_000);

  // Schedule recurring jobs
  for (const job of CLEANUP_JOBS) {
    timers.set(
      job.name,
      setInterval(() => {
        void runJob(job);
      }, job.interval),
    );
  }

  Logger.info('Cleanup jobs scheduled');
};

export const stopCleanupJobs = (): void => {
  for (const [name, timer] of timers) {
    clearInterval(timer);
    timers.delete(name);
  }
  Logger.info('Cleanup jobs stopped');
};
