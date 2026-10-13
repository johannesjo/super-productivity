import type { Operation, OperationLogEntry } from './operation.types';

export interface RegularOpsAfterFullStateUploadPlan<
  TEntry extends OperationLogEntry<Operation<string>> = OperationLogEntry,
> {
  opsIncludedInSnapshot: TEntry[];
  opsAfterSnapshot: TEntry[];
}

export interface PlanRegularOpsAfterFullStateUploadOptions<
  TEntry extends OperationLogEntry<Operation<string>> = OperationLogEntry,
> {
  regularOps: TEntry[];
  lastUploadedFullStateOpSeq?: number;
}

/**
 * Splits regular operations around an uploaded full-state snapshot.
 *
 * Classification uses the local op-log `seq` (monotonic append order on this
 * client), NOT the UUIDv7 op id: lexical id order follows the wall clock, which
 * can roll back (e.g. NTP correction, restart), so a post-snapshot op could get
 * a smaller id, be treated as "included in snapshot", and silently never reach
 * the server. `seq` is exactly creation order, which is what "captured in the
 * frozen snapshot payload" means. Ops appended before the full-state op are
 * already represented in the snapshot and can be marked synced; later ops still
 * need the normal upload path.
 *
 * When no seq is available (no full-state op uploaded, or its local entry is
 * unknown, e.g. the id came from a remote source), everything stays on the
 * upload path — uploading an op that is also in the snapshot is safe (server
 * dedups by op id), whereas skipping one that is not would lose data.
 */
export const planRegularOpsAfterFullStateUpload = <
  TEntry extends OperationLogEntry<Operation<string>> = OperationLogEntry,
>({
  regularOps,
  lastUploadedFullStateOpSeq,
}: PlanRegularOpsAfterFullStateUploadOptions<TEntry>): RegularOpsAfterFullStateUploadPlan<TEntry> => {
  if (lastUploadedFullStateOpSeq === undefined) {
    return {
      opsIncludedInSnapshot: [],
      opsAfterSnapshot: regularOps,
    };
  }

  const opsIncludedInSnapshot: TEntry[] = [];
  const opsAfterSnapshot: TEntry[] = [];

  for (const entry of regularOps) {
    if (entry.seq < lastUploadedFullStateOpSeq) {
      opsIncludedInSnapshot.push(entry);
    } else {
      opsAfterSnapshot.push(entry);
    }
  }

  return { opsIncludedInSnapshot, opsAfterSnapshot };
};

export type UploadLastServerSeqUpdateReason =
  | 'complete'
  | 'has-more-with-piggyback'
  | 'has-more-empty';

export interface PlanUploadLastServerSeqUpdateOptions {
  currentHighestReceivedSeq: number;
  responseLatestSeq: number;
  hasMorePiggyback: boolean;
  piggybackServerSeqs: number[];
}

export interface UploadLastServerSeqUpdatePlan {
  seqToStore: number;
  highestReceivedSeq: number;
  hasMorePiggyback: boolean;
  reason: UploadLastServerSeqUpdateReason;
}

/**
 * Plans the client-side last-server-sequence update after an upload response.
 *
 * When the server indicates more piggybacked ops are available, callers must
 * advance only to the highest piggybacked sequence actually received. This
 * keeps the follow-up download able to fetch the remaining remote ops. Across
 * chunks the stored sequence must never regress.
 */
export const planUploadLastServerSeqUpdate = ({
  currentHighestReceivedSeq,
  responseLatestSeq,
  hasMorePiggyback,
  piggybackServerSeqs,
}: PlanUploadLastServerSeqUpdateOptions): UploadLastServerSeqUpdatePlan => {
  if (hasMorePiggyback) {
    if (piggybackServerSeqs.length > 0) {
      const maxPiggybackSeq = Math.max(...piggybackServerSeqs);
      const highestReceivedSeq = Math.max(currentHighestReceivedSeq, maxPiggybackSeq);
      return {
        seqToStore: highestReceivedSeq,
        highestReceivedSeq,
        hasMorePiggyback: true,
        reason: 'has-more-with-piggyback',
      };
    }

    return {
      seqToStore: currentHighestReceivedSeq,
      highestReceivedSeq: currentHighestReceivedSeq,
      hasMorePiggyback: true,
      reason: 'has-more-empty',
    };
  }

  const highestReceivedSeq = Math.max(currentHighestReceivedSeq, responseLatestSeq);
  return {
    seqToStore: highestReceivedSeq,
    highestReceivedSeq,
    hasMorePiggyback: false,
    reason: 'complete',
  };
};
