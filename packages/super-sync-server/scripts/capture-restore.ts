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
 * `status` inventories restored pending captures and exits non-zero while any
 * is unresolved. It is necessary before resumption and never sufficient: it can
 * only count rows the restore kept, so a capture submitted AND published after
 * the backup leaves nothing here to count while still having consumed a
 * publisher clock value on the devices that downloaded it. Clearing the hold is
 * a judgement against the account-by-account recovery record, not an exit code.
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
  npm run capture-restore -- status [--created-before <ISO timestamp>]
  npm run capture-restore -- resolve <userId> <captureId> <${CAPTURE_RECOVERY_RESOLUTIONS.join('|')}>

  delivered_out_of_band  Evidence outside this database shows the capture was
                         published before the rollback. Reclaims the publisher
                         clock value that publication already consumed.
  discarded_by_user      The user decided this capture must not be published.

  --created-before       Count only captures stored before this instant, i.e.
                         the snapshot the restore came from. Use it once the
                         deployment accepts new submissions, or the backlog
                         mixes restore-era rows with legitimately new ones and
                         never empties.

Resolution clears the stored title and notes and cannot be undone.
Re-run \`status\` afterwards; it exits 1 while anything stays unresolved.`;

const publication = createCapturePublicationService(prisma);

/** Reads `--created-before <iso>`; returns undefined when absent, null when unusable. */
const parseCreatedBefore = (args: string[]): Date | undefined | null => {
  const at = args.indexOf('--created-before');
  if (at === -1) return undefined;
  const raw = args[at + 1];
  const parsed = raw ? new Date(raw) : new Date('');
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const runStatus = async (args: string[]): Promise<number> => {
  const createdBefore = parseCreatedBefore(args);
  if (createdBefore === null) {
    console.log(USAGE);
    return 1;
  }
  const backlog = await publication.readUnresolvedCaptureBacklog({ createdBefore });
  if (backlog.length === 0) {
    console.log(
      createdBefore
        ? `No pending capture stored before ${createdBefore.toISOString()} is unresolved.`
        : 'No restored pending capture is unresolved.',
    );
    console.log(
      'This does not by itself authorize clearing the hold: a capture submitted\n' +
        'and published after the backup left no row here to count, and its\n' +
        'publisher clock value is still unreclaimed. Check the recovery record\n' +
        'for submissions accepted after the snapshot before resuming.',
    );
    return 0;
  }
  console.log(`Unresolved captures for ${backlog.length} account(s):`);
  for (const { userId, unresolved } of backlog) {
    const captures = await prisma.agentCapture.findMany({
      where: {
        userId,
        publishedOpId: null,
        resolution: null,
        ...(createdBefore ? { createdAt: { lt: createdBefore } } : {}),
      },
      select: { captureId: true, createdAt: true },
      orderBy: { captureId: 'asc' },
    });
    console.log(`  user ${userId}: ${unresolved}`);
    for (const capture of captures) {
      console.log(`    ${capture.createdAt.toISOString()}  ${capture.captureId}`);
    }
  }
  console.log(
    '\nKeep ENABLE_AGENT_CAPTURE_DELIVERY=false at least until this list is empty.',
  );
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
  if (command === 'status') return runStatus(args);
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
