/**
 * Read-only diagnostics for SuperSync E2EE operation batches.
 *
 * This file intentionally has no database or application imports. It must never
 * upload operations, write decrypted payloads, or log secrets/user content.
 */

import { createHash } from 'node:crypto';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import {
  SUPER_SYNC_SNAPSHOT_OP_TYPES,
  SuperSyncClientIdSchema,
  SuperSyncDownloadOpsResponseSchema,
  SuperSyncOperationSchema,
  type SuperSyncServerOperation,
} from '@sp/shared-schema';
import { decrypt, decryptBatch } from '@sp/sync-core';
import { z } from 'zod';

const BUNDLE_FORMAT = 'super-productivity-encrypted-ops-diagnostic';
const BUNDLE_VERSION = 1;
const DOWNLOAD_PAGE_SIZE = 500;
const MAX_DOWNLOAD_PAGES = 1_000;
const REQUEST_TIMEOUT_MS = 75_000;
const FULL_STATE_OP_TYPES = new Set<string>(SUPER_SYNC_SNAPSHOT_OP_TYPES);

const BundleOperationSchema = SuperSyncOperationSchema.strict();
const BundleServerOperationSchema = z
  .object({
    serverSeq: z.number().int().min(1),
    op: BundleOperationSchema,
    receivedAt: z.number(),
  })
  .strict();
const DiagnosticBundlePageSchema = z
  .object({
    requestSinceSeq: z.number().int().min(0),
    ops: z.array(BundleServerOperationSchema).max(DOWNLOAD_PAGE_SIZE),
    hasMore: z.boolean(),
    latestSeq: z.number().int().min(0),
    gapDetected: z.literal(true).optional(),
  })
  .strict();
const DiagnosticBundleContentSchema = z
  .object({
    format: z.literal(BUNDLE_FORMAT),
    version: z.literal(BUNDLE_VERSION),
    capturedAt: z.string().datetime(),
    sourceBaseUrl: z.string().url(),
    pageSize: z.literal(DOWNLOAD_PAGE_SIZE),
    latestSeq: z.number().int().min(0),
    pages: z.array(DiagnosticBundlePageSchema).min(1).max(MAX_DOWNLOAD_PAGES),
  })
  .strict();
const DiagnosticBundleSchema = DiagnosticBundleContentSchema.extend({
  checksumSha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();

export type DiagnosticBundlePage = z.infer<typeof DiagnosticBundlePageSchema>;
type DiagnosticBundleContent = z.infer<typeof DiagnosticBundleContentSchema>;
export type DiagnosticBundle = z.infer<typeof DiagnosticBundleSchema>;

type FetchImplementation = (input: string | URL, init?: RequestInit) => Promise<Response>;

export interface FetchEncryptedOpsBundleOptions {
  baseUrl: string;
  accessToken: string;
  fetchImpl?: FetchImplementation;
  capturedAt?: Date;
}

export interface ReproductionOptions {
  sinceSeq?: number;
  excludeClient?: string;
  appliedOperationIds?: ReadonlySet<string>;
}

export interface ReproductionPage {
  requestSinceSeq: number;
  rawOperationCount: number;
  operations: SuperSyncServerOperation[];
}

export type DiagnosticFailureStage = 'envelope' | 'decrypt' | 'parse';

export interface DiagnosticFailure {
  serverSeq: number;
  opId: string;
  stage: DiagnosticFailureStage;
}

export interface EncryptedOperationsDiagnosis {
  batchStatus: 'passed' | 'failed';
  classification:
    | 'decrypts-and-parses-only'
    | 'operation-failures'
    | 'batch-runtime-only'
    | 'no-operation-decrypted';
  decryptedCount: number;
  parsedCount: number;
  failures: DiagnosticFailure[];
}

export interface DiagnosticPageReport extends EncryptedOperationsDiagnosis {
  pageNumber: number;
  requestSinceSeq: number;
  firstServerSeq?: number;
  lastServerSeq?: number;
  rawOperationCount: number;
  diagnosedOperationCount: number;
}

export interface DiagnosticReport {
  bundleChecksumSha256: string;
  latestSeq: number;
  classification: EncryptedOperationsDiagnosis['classification'];
  passwordEvidence:
    | 'confirmed-for-some-operations'
    | 'no-operation-decrypted'
    | 'not-tested';
  rawOperationCount: number;
  diagnosedOperationCount: number;
  decryptedCount: number;
  parsedCount: number;
  failureCount: number;
  reproduction: {
    sinceSeq: number;
    excludeClient?: string;
    appliedOperationIdCount: number;
    pageSize: number;
  };
  pages: DiagnosticPageReport[];
}

const normalizeBaseUrl = (input: string): string => {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error('The SuperSync base URL is invalid.');
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('The SuperSync base URL must not contain credentials or a query.');
  }
  const isLocalHttp =
    url.protocol === 'http:' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !isLocalHttp) {
    throw new Error('The SuperSync base URL must use HTTPS.');
  }
  return url.toString().replace(/\/$/, '');
};

const sanitizeAccessToken = (token: string): string => {
  const sanitized = token.replace(/[^\x20-\x7e]/g, '');
  if (sanitized.length === 0) {
    throw new Error('The access-token file is empty.');
  }
  return sanitized;
};

const sanitizeServerOperation = (
  serverOperation: SuperSyncServerOperation,
): SuperSyncServerOperation => {
  const result = BundleServerOperationSchema.safeParse(serverOperation);
  if (!result.success) {
    throw new Error('A downloaded operation contains unsupported or invalid fields.');
  }
  return result.data;
};

const canonicalizeForChecksum = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(canonicalizeForChecksum);
  }
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, nestedValue]) => nestedValue !== undefined)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, nestedValue]) => [key, canonicalizeForChecksum(nestedValue)]),
  );
};

const checksumBundleContent = (content: DiagnosticBundleContent): string =>
  createHash('sha256')
    .update(JSON.stringify(canonicalizeForChecksum(content)))
    .digest('hex');

const assertBundleInvariants = (content: DiagnosticBundleContent): void => {
  const { pages, latestSeq } = content;
  const operations = pages.flatMap((page) => page.ops);

  let expectedRequestSinceSeq = 0;
  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const page = pages[pageIndex];
    if (page.requestSinceSeq !== expectedRequestSinceSeq) {
      throw new Error(`Bundle page ${pageIndex + 1} has a mismatched request cursor.`);
    }
    if (page.latestSeq !== latestSeq) {
      throw new Error('The server latestSeq changed while the bundle was captured.');
    }
    if (page.gapDetected) {
      throw new Error(`Bundle page ${pageIndex + 1} reports a server-sequence gap.`);
    }
    const isLastPage = pageIndex === pages.length - 1;
    if (page.hasMore === isLastPage) {
      throw new Error(`Bundle page ${pageIndex + 1} has inconsistent pagination.`);
    }
    if (page.hasMore && page.ops.length === 0) {
      throw new Error(`Bundle page ${pageIndex + 1} did not advance its cursor.`);
    }
    if (page.ops.length > 0) {
      expectedRequestSinceSeq = page.ops[page.ops.length - 1].serverSeq;
    }
  }

  if (latestSeq === 0) {
    if (operations.length > 0) {
      throw new Error('An empty server sequence cannot contain operations.');
    }
    return;
  }
  if (operations.length === 0) {
    throw new Error('The bundle contains no operations for a non-empty server.');
  }

  const seenOperationIds = new Set<string>();
  for (let index = 0; index < operations.length; index++) {
    const current = operations[index];
    if (seenOperationIds.has(current.op.id)) {
      throw new Error('The bundle contains a duplicate operation ID.');
    }
    seenOperationIds.add(current.op.id);
    if (index > 0 && current.serverSeq !== operations[index - 1].serverSeq + 1) {
      throw new Error(
        `The bundle has a server-sequence gap before ${current.serverSeq}.`,
      );
    }
  }

  const first = operations[0];
  if (first.serverSeq !== 1) {
    const isSafeBoundary =
      FULL_STATE_OP_TYPES.has(first.op.opType) &&
      (first.op.opType !== 'REPAIR' || typeof first.op.repairBaseServerSeq === 'number');
    if (!isSafeBoundary) {
      throw new Error('The bundle does not start at a safe full-state boundary.');
    }
  }
  if (operations[operations.length - 1].serverSeq !== latestSeq) {
    throw new Error('The bundle does not reach its pinned latestSeq.');
  }
};

export const validateDiagnosticBundle = (input: unknown): DiagnosticBundle => {
  let parsed: DiagnosticBundle;
  try {
    parsed = DiagnosticBundleSchema.parse(input);
  } catch {
    throw new Error('The diagnostic bundle has an invalid structure.');
  }
  const { checksumSha256, ...content } = parsed;
  if (checksumBundleContent(content) !== checksumSha256) {
    throw new Error('The diagnostic bundle checksum does not match.');
  }
  assertBundleInvariants(content);
  return parsed;
};

export const fetchEncryptedOpsBundle = async ({
  baseUrl,
  accessToken,
  fetchImpl = fetch,
  capturedAt = new Date(),
}: FetchEncryptedOpsBundleOptions): Promise<DiagnosticBundle> => {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const token = sanitizeAccessToken(accessToken);
  const pages: DiagnosticBundlePage[] = [];
  let sinceSeq = 0;
  let latestSeq: number | undefined;

  while (true) {
    const url = new URL(`${normalizedBaseUrl}/api/sync/ops`);
    url.searchParams.set('sinceSeq', String(sinceSeq));
    url.searchParams.set('limit', String(DOWNLOAD_PAGE_SIZE));

    let response: Response;
    try {
      response = await fetchImpl(url, {
        method: 'GET',
        redirect: 'error',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new Error(`Download request for page ${pages.length + 1} failed.`);
    }
    if (!response.ok) {
      throw new Error(
        `Download request for page ${pages.length + 1} returned HTTP ${response.status}.`,
      );
    }

    let rawResponse: unknown;
    try {
      rawResponse = await response.json();
    } catch {
      throw new Error(`Download response for page ${pages.length + 1} was not JSON.`);
    }

    const validationResult = SuperSyncDownloadOpsResponseSchema.safeParse(rawResponse);
    if (!validationResult.success) {
      throw new Error(
        `Download response for page ${pages.length + 1} has an invalid structure.`,
      );
    }
    const pageResponse = validationResult.data;
    if (latestSeq === undefined) {
      latestSeq = pageResponse.latestSeq;
    } else if (pageResponse.latestSeq !== latestSeq) {
      throw new Error('The server latestSeq changed while the bundle was captured.');
    }
    if (pageResponse.gapDetected) {
      throw new Error(`Download response for page ${pages.length + 1} reports a gap.`);
    }

    const operations = pageResponse.ops.map(sanitizeServerOperation);
    pages.push({
      requestSinceSeq: sinceSeq,
      ops: operations,
      hasMore: pageResponse.hasMore,
      latestSeq: pageResponse.latestSeq,
      ...(pageResponse.gapDetected ? { gapDetected: true as const } : {}),
    });

    if (!pageResponse.hasMore) {
      break;
    }
    if (pages.length >= MAX_DOWNLOAD_PAGES) {
      throw new Error(
        `The download exceeds the ${MAX_DOWNLOAD_PAGES}-page safety limit.`,
      );
    }
    if (operations.length === 0) {
      throw new Error('The server returned an empty page with hasMore=true.');
    }
    const nextSinceSeq = operations[operations.length - 1].serverSeq;
    if (nextSinceSeq <= sinceSeq) {
      throw new Error('The server returned a non-progressing page cursor.');
    }
    sinceSeq = nextSinceSeq;
  }

  const content: DiagnosticBundleContent = {
    format: BUNDLE_FORMAT,
    version: BUNDLE_VERSION,
    capturedAt: capturedAt.toISOString(),
    sourceBaseUrl: normalizedBaseUrl,
    pageSize: DOWNLOAD_PAGE_SIZE,
    latestSeq: latestSeq ?? 0,
    pages,
  };
  return validateDiagnosticBundle({
    ...content,
    checksumSha256: checksumBundleContent(content),
  });
};

const createReproductionPagesFromValidatedBundle = (
  bundle: DiagnosticBundle,
  {
    sinceSeq = 0,
    excludeClient,
    appliedOperationIds = new Set<string>(),
  }: ReproductionOptions = {},
): ReproductionPage[] => {
  if (!Number.isSafeInteger(sinceSeq) || sinceSeq < 0) {
    throw new Error('The client cursor must be a non-negative safe integer.');
  }
  if (sinceSeq > bundle.latestSeq) {
    throw new Error(
      'The client cursor is ahead of the captured server sequence; omit --since-seq to reproduce the reset-to-zero download.',
    );
  }
  if (
    excludeClient !== undefined &&
    !SuperSyncClientIdSchema.safeParse(excludeClient).success
  ) {
    throw new Error('The excluded client ID is invalid.');
  }

  const serverVisibleOperations = bundle.pages
    .flatMap((page) => page.ops)
    .filter(({ serverSeq }) => serverSeq > sinceSeq)
    .filter(({ op }) => op.clientId !== excludeClient);
  if (serverVisibleOperations.length === 0) {
    return [{ requestSinceSeq: sinceSeq, rawOperationCount: 0, operations: [] }];
  }

  const pages: ReproductionPage[] = [];
  let requestSinceSeq = sinceSeq;
  for (
    let offset = 0;
    offset < serverVisibleOperations.length;
    offset += DOWNLOAD_PAGE_SIZE
  ) {
    const rawOperations = serverVisibleOperations.slice(
      offset,
      offset + DOWNLOAD_PAGE_SIZE,
    );
    pages.push({
      requestSinceSeq,
      rawOperationCount: rawOperations.length,
      operations: rawOperations.filter(({ op }) => !appliedOperationIds.has(op.id)),
    });
    requestSinceSeq = rawOperations[rawOperations.length - 1].serverSeq;
  }
  return pages;
};

export const createReproductionPages = (
  inputBundle: unknown,
  options: ReproductionOptions = {},
): ReproductionPage[] =>
  createReproductionPagesFromValidatedBundle(
    validateDiagnosticBundle(inputBundle),
    options,
  );

const parsePlaintext = (plaintext: string): boolean => {
  try {
    JSON.parse(plaintext);
    return true;
  } catch {
    return false;
  }
};

export const diagnoseEncryptedOperations = async (
  operations: SuperSyncServerOperation[],
  password: string,
): Promise<EncryptedOperationsDiagnosis> => {
  const encryptedOperations = operations.filter(
    ({ op }) => op.isPayloadEncrypted === true,
  );
  const failures: DiagnosticFailure[] = operations
    .filter(({ op }) => op.isPayloadEncrypted !== true)
    .map(({ serverSeq, op }) => ({
      serverSeq,
      opId: op.id,
      stage: 'envelope' as const,
    }));

  for (const { serverSeq, op } of encryptedOperations) {
    if (typeof op.payload !== 'string') {
      failures.push({ serverSeq, opId: op.id, stage: 'envelope' });
    }
  }

  const decryptableOperations = encryptedOperations.filter(
    ({ op }) => typeof op.payload === 'string',
  );
  const ciphertexts = decryptableOperations.map(({ op }) => op.payload as string);
  let batchStatus: EncryptedOperationsDiagnosis['batchStatus'] = 'passed';
  let plaintexts: string[] | undefined;

  try {
    plaintexts = await decryptBatch(ciphertexts, password);
  } catch {
    batchStatus = 'failed';
  }

  let decryptedCount = 0;
  let parsedCount = 0;
  if (plaintexts) {
    decryptedCount = plaintexts.length;
    plaintexts.forEach((plaintext, index) => {
      const { serverSeq, op } = decryptableOperations[index];
      if (parsePlaintext(plaintext)) {
        parsedCount++;
      } else {
        failures.push({ serverSeq, opId: op.id, stage: 'parse' });
      }
    });
  } else {
    for (const { serverSeq, op } of decryptableOperations) {
      try {
        const plaintext = await decrypt(op.payload as string, password);
        decryptedCount++;
        if (parsePlaintext(plaintext)) {
          parsedCount++;
        } else {
          failures.push({ serverSeq, opId: op.id, stage: 'parse' });
        }
      } catch {
        failures.push({ serverSeq, opId: op.id, stage: 'decrypt' });
      }
    }
  }

  let classification: EncryptedOperationsDiagnosis['classification'];
  if (failures.length > 0) {
    const allFailedAtDecrypt =
      parsedCount === 0 && failures.every(({ stage }) => stage === 'decrypt');
    classification = allFailedAtDecrypt ? 'no-operation-decrypted' : 'operation-failures';
  } else if (batchStatus === 'failed') {
    classification = 'batch-runtime-only';
  } else {
    classification = 'decrypts-and-parses-only';
  }

  return {
    batchStatus,
    classification,
    decryptedCount,
    parsedCount,
    failures,
  };
};

export const diagnoseDiagnosticBundle = async (
  inputBundle: unknown,
  password: string,
  options: ReproductionOptions = {},
): Promise<DiagnosticReport> => {
  const bundle = validateDiagnosticBundle(inputBundle);
  const reproductionPages = createReproductionPagesFromValidatedBundle(bundle, options);
  const pages: DiagnosticPageReport[] = [];

  for (let index = 0; index < reproductionPages.length; index++) {
    const page = reproductionPages[index];
    const diagnosis = await diagnoseEncryptedOperations(page.operations, password);
    pages.push({
      pageNumber: index + 1,
      requestSinceSeq: page.requestSinceSeq,
      ...(page.operations.length > 0
        ? {
            firstServerSeq: page.operations[0].serverSeq,
            lastServerSeq: page.operations[page.operations.length - 1].serverSeq,
          }
        : {}),
      rawOperationCount: page.rawOperationCount,
      diagnosedOperationCount: page.operations.length,
      ...diagnosis,
    });
  }

  const rawOperationCount = pages.reduce((sum, page) => sum + page.rawOperationCount, 0);
  const diagnosedOperationCount = pages.reduce(
    (sum, page) => sum + page.diagnosedOperationCount,
    0,
  );
  const decryptedCount = pages.reduce((sum, page) => sum + page.decryptedCount, 0);
  const parsedCount = pages.reduce((sum, page) => sum + page.parsedCount, 0);
  const failures = pages.flatMap((page) => page.failures);
  const decryptFailureCount = failures.filter(({ stage }) => stage === 'decrypt').length;

  let classification: DiagnosticReport['classification'];
  if (failures.length > 0) {
    classification =
      decryptedCount === 0 && decryptFailureCount === failures.length
        ? 'no-operation-decrypted'
        : 'operation-failures';
  } else if (pages.some((page) => page.classification === 'batch-runtime-only')) {
    classification = 'batch-runtime-only';
  } else {
    classification = 'decrypts-and-parses-only';
  }

  const encryptedCandidateCount = decryptedCount + decryptFailureCount;
  const passwordEvidence: DiagnosticReport['passwordEvidence'] =
    decryptedCount > 0
      ? 'confirmed-for-some-operations'
      : encryptedCandidateCount > 0
        ? 'no-operation-decrypted'
        : 'not-tested';

  return {
    bundleChecksumSha256: bundle.checksumSha256,
    latestSeq: bundle.latestSeq,
    classification,
    passwordEvidence,
    rawOperationCount,
    diagnosedOperationCount,
    decryptedCount,
    parsedCount,
    failureCount: failures.length,
    reproduction: {
      sinceSeq: options.sinceSeq ?? 0,
      ...(options.excludeClient ? { excludeClient: options.excludeClient } : {}),
      appliedOperationIdCount: options.appliedOperationIds?.size ?? 0,
      pageSize: DOWNLOAD_PAGE_SIZE,
    },
    pages,
  };
};

const USAGE = `
diagnose-encrypted-ops — capture and inspect SuperSync E2EE operation batches

Fetch an encrypted-payload bundle (GET requests only):
  npm run diagnose-encrypted-ops -- fetch \\
    --base-url <url> --token-file <path> --out <bundle.json>

Diagnose the captured bundle offline:
  npm run diagnose-encrypted-ops -- diagnose \\
    --in <bundle.json> --key-file <path> [--exclude-client <id>] \\
    [--since-seq <n>] [--applied-op-ids-file <path>] [--report <report.json>]

Secret values are accepted only through private files, never command-line flags.
The fetch command always starts at sequence zero and deliberately omits
excludeClient so the bundle preserves every downloadable operation.
`;

interface CliDependencies {
  fetchImpl?: FetchImplementation;
  capturedAt?: Date;
  log?: (message: string) => void;
}

const parseOptions = (
  argv: string[],
  allowedOptions: ReadonlySet<string>,
): Map<string, string> => {
  const options = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const option = argv[index];
    const value = argv[index + 1];
    if (!allowedOptions.has(option)) {
      throw new Error(`Unknown option: ${option}`);
    }
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`Missing value for ${option}.`);
    }
    if (options.has(option)) {
      throw new Error(`Duplicate option: ${option}`);
    }
    options.set(option, value);
  }
  return options;
};

const requireOption = (options: Map<string, string>, name: string): string => {
  const value = options.get(name);
  if (!value) {
    throw new Error(`Missing required option: ${name}`);
  }
  return value;
};

const readSinceSeqOption = (value?: string): number => {
  if (value === undefined) {
    return 0;
  }
  if (!/^(0|[1-9]\d*)$/.test(value)) {
    throw new Error('--since-seq must be a non-negative safe integer.');
  }
  const sinceSeq = Number(value);
  if (!Number.isSafeInteger(sinceSeq)) {
    throw new Error('--since-seq must be a non-negative safe integer.');
  }
  return sinceSeq;
};

const readPrivateSecretFile = (path: string, label: string): string => {
  let mode: number;
  let raw: string;
  try {
    mode = statSync(path).mode;
    raw = readFileSync(path, 'utf8');
  } catch {
    throw new Error(`Unable to read the ${label} file.`);
  }
  if (process.platform !== 'win32' && (mode & 0o077) !== 0) {
    throw new Error(`The ${label} file permissions must be 0600.`);
  }
  const value = raw.endsWith('\r\n')
    ? raw.slice(0, -2)
    : raw.endsWith('\n')
      ? raw.slice(0, -1)
      : raw;
  if (value.length === 0) {
    throw new Error(`The ${label} file is empty.`);
  }
  if (value.includes('\n') || value.includes('\r')) {
    throw new Error(`The ${label} file must contain exactly one line.`);
  }
  return value;
};

const readJsonFile = (path: string, label: string): unknown => {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as unknown;
  } catch {
    throw new Error(`Unable to read a valid ${label} JSON file.`);
  }
};

const readAppliedOperationIds = (path?: string): ReadonlySet<string> => {
  if (!path) {
    return new Set<string>();
  }
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    throw new Error('Unable to read the applied-operation IDs file.');
  }
  const ids = raw
    .split(/\r?\n/)
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
  if (ids.some((id) => id.length > 255)) {
    throw new Error('The applied-operation IDs file contains an invalid ID.');
  }
  return new Set(ids);
};

const writePrivateJsonFile = (path: string, value: unknown): void => {
  try {
    writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx',
      mode: 0o600,
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new Error('The output file already exists; refusing to overwrite it.');
    }
    throw new Error('Unable to write the output file.');
  }
};

const logReportSummary = (
  report: DiagnosticReport,
  log: (message: string) => void,
): void => {
  log(`Classification: ${report.classification}`);
  log(`Password evidence: ${report.passwordEvidence}`);
  log(
    `Operations: ${report.diagnosedOperationCount}; decrypted: ${report.decryptedCount}; ` +
      `parsed JSON: ${report.parsedCount}; failures: ${report.failureCount}`,
  );
  for (const page of report.pages) {
    if (page.classification === 'decrypts-and-parses-only') {
      continue;
    }
    log(
      `Page ${page.pageNumber} (sinceSeq=${page.requestSinceSeq}): ${page.classification}`,
    );
    for (const failure of page.failures) {
      log(
        `  serverSeq=${failure.serverSeq} opId=${JSON.stringify(failure.opId)} ` +
          `stage=${failure.stage}`,
      );
    }
  }
};

export const runCli = async (
  argv: string[],
  { fetchImpl = fetch, capturedAt = new Date(), log = console.log }: CliDependencies = {},
): Promise<void> => {
  const command = argv[0];
  if (!command || command === '--help' || command === '-h') {
    log(USAGE.trim());
    return;
  }

  if (command === 'fetch') {
    const options = parseOptions(
      argv.slice(1),
      new Set(['--base-url', '--token-file', '--out']),
    );
    const token = readPrivateSecretFile(
      requireOption(options, '--token-file'),
      'access-token',
    );
    const bundle = await fetchEncryptedOpsBundle({
      baseUrl: requireOption(options, '--base-url'),
      accessToken: token,
      fetchImpl,
      capturedAt,
    });
    writePrivateJsonFile(requireOption(options, '--out'), bundle);
    const operationCount = bundle.pages.reduce((sum, page) => sum + page.ops.length, 0);
    log(
      `Captured ${operationCount} operations in ${bundle.pages.length} page(s) ` +
        `through latestSeq ${bundle.latestSeq}.`,
    );
    log('The bundle contains encrypted payloads plus plaintext routing metadata.');
    return;
  }

  if (command === 'diagnose') {
    const options = parseOptions(
      argv.slice(1),
      new Set([
        '--in',
        '--key-file',
        '--exclude-client',
        '--since-seq',
        '--applied-op-ids-file',
        '--report',
      ]),
    );
    const bundle = readJsonFile(requireOption(options, '--in'), 'diagnostic bundle');
    const password = readPrivateSecretFile(
      requireOption(options, '--key-file'),
      'encryption-key',
    );
    const report = await diagnoseDiagnosticBundle(bundle, password, {
      sinceSeq: readSinceSeqOption(options.get('--since-seq')),
      ...(options.get('--exclude-client')
        ? { excludeClient: options.get('--exclude-client') }
        : {}),
      appliedOperationIds: readAppliedOperationIds(options.get('--applied-op-ids-file')),
    });
    const reportPath = options.get('--report');
    if (reportPath) {
      writePrivateJsonFile(reportPath, report);
      log('Wrote a metadata-only diagnostic report.');
    }
    logReportSummary(report, log);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
};

if (require.main === module) {
  void runCli(process.argv.slice(2)).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown diagnostic error.';
    console.error(`Error: ${message}`);
    process.exitCode = 1;
  });
}
