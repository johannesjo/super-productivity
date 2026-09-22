/**
 * capture-restore.ts — operator tool for the capture restore hold.
 *
 * A point-in-time restore rolls the capture queue row, its terminal receipt and
 * the account's publisher counter back together, so a restored pending row
 * cannot prove it was never delivered. This tool does NOT reconstruct that
 * evidence: the operator establishes each outcome from devices, retained
 * artifacts or the user, and records it here. See
 * docs/backup-and-recovery.md#capture-restore-hold for the full procedure.
 *
 * `status` is the resumption gate. It exits non-zero while any capture is
 * unresolved, so enabling ENABLE_AGENT_CAPTURE_DELIVERY stays a deliberate act
 * taken against an empty backlog.
 *
 * Prints only user IDs, capture IDs and counts — never titles, notes or keys.
 */
import { prisma, disconnectDb } from '../src/db';
import {
  CAPTURE_RECOVERY_RESOLUTIONS,
  createCapturePublicationService,
  isCaptureRecoveryResolution,
} from '../src/sync/capture-publication.service';

const USAGE = `Usage:
  npm run capture-restore -- status
  npm run capture-restore -- resolve <userId> <captureId> <${CAPTURE_RECOVERY_RESOLUTIONS.join('|')}>

  delivered_out_of_band  Evidence outside this database shows the capture was
                         published before the rollback. Reclaims the publisher
                         clock value that publication already consumed.
  discarded_by_user      The user decided this capture must not be published.

Resolution clears the stored title and notes and cannot be undone.
Re-run \`status\` afterwards; it exits 1 while anything stays unresolved.`;

const publication = createCapturePublicationService(prisma);

const runStatus = async (): Promise<number> => {
  const backlog = await publication.readUnresolvedCaptureBacklog();
  if (backlog.length === 0) {
    console.log('No unresolved captures. The restore hold may be cleared.');
    return 0;
  }
  console.log(`Unresolved captures for ${backlog.length} account(s):`);
  for (const { userId, unresolved } of backlog) {
    const captures = await prisma.agentCapture.findMany({
      where: { userId, publishedOpId: null, resolution: null },
      select: { captureId: true },
      orderBy: { captureId: 'asc' },
    });
    console.log(
      `  user ${userId}: ${unresolved} -> ${captures.map((c) => c.captureId).join(', ')}`,
    );
  }
  console.log('\nKeep ENABLE_AGENT_CAPTURE_DELIVERY=false until this list is empty.');
  return 1;
};

const runResolve = async (args: string[]): Promise<number> => {
  const [rawUserId, captureId, resolution] = args;
  const userId = Number(rawUserId);
  if (
    !Number.isInteger(userId) ||
    !captureId ||
    !isCaptureRecoveryResolution(resolution)
  ) {
    console.log(USAGE);
    return 1;
  }

  const result = await publication.resolveCapture({ userId, captureId, resolution });
  switch (result.status) {
    case 'resolved':
      console.log(
        `Resolved ${captureId} for user ${userId} as ${result.resolution}. ` +
          `Publication watermark is now ${result.publicationWatermark}.`,
      );
      return 0;
    case 'already_resolved':
      console.log(
        `${captureId} was already resolved as ${result.resolution}; nothing changed. ` +
          'Recorded outcomes are never overwritten.',
      );
      return 0;
    case 'already_published':
      console.log(
        `${captureId} holds a terminal receipt (op ${result.receipt.opId}, ` +
          `seq ${result.receipt.serverSeq}); it needs no resolution.`,
      );
      return 0;
    case 'missing':
      console.error(`No capture ${captureId} for user ${userId}.`);
      return 1;
  }
};

const main = async (): Promise<number> => {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'status') return runStatus();
  if (command === 'resolve') return runResolve(args);
  console.log(USAGE);
  return 1;
};

main()
  .catch((err) => {
    console.error(err);
    return 1;
  })
  .then(async (code) => {
    await disconnectDb();
    process.exit(code);
  });
