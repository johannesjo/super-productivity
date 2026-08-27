export interface SyncFilePrefixParams {
  isCompress: boolean;
  isEncrypt: boolean;
  modelVersion: number;
}

export interface SyncFilePrefixParamsOutput {
  isCompressed: boolean;
  isEncrypted: boolean;
  modelVersion: number;
  cleanDataStr: string;
}

export interface SyncFilePrefixHelpers {
  getSyncFilePrefix(cfg: SyncFilePrefixParams): string;
  extractSyncFileStateFromPrefix(dataStr: string): SyncFilePrefixParamsOutput;
}

export interface SyncFilePrefixConfig {
  prefix: string;
  endSeparator?: string;
  createInvalidPrefixError?: (details: SyncFilePrefixInvalidPrefixDetails) => Error;
}

/**
 * Coarse character class of a rejected file's head. Deliberately an enum of
 * shapes, never the bytes themselves — the head of a sync file is user data.
 */
export type SyncFileHeadShape = 'base64' | 'markup' | 'json' | 'other';

export interface SyncFilePrefixInvalidPrefixDetails {
  expectedPrefix: string;
  endSeparator: string;
  inputLength: number;
  /**
   * Offset of `prefix` within the sampled head, or -1 when absent entirely.
   * Separates "header damaged" (>= 0) from "header gone" (-1) — different
   * causes, and the log could not previously tell them apart (#9627).
   */
  prefixAt: number;
  /**
   * What we got instead. `markup`/`json` point at a bad RESPONSE (proxy page,
   * WebDAV multistatus, error envelope); `base64` points at our own ciphertext
   * with its header lost, i.e. a problem with the STORED file. That is the
   * distinction that decides whether a decode failure is a transport issue.
   *
   * It does NOT separate a head-strip from a larger fragment — both read as
   * `base64` — since nothing local knows the file's expected size.
   */
  headShape: SyncFileHeadShape;
}

export class SyncFilePrefixError extends Error {
  override name = 'SyncFilePrefixError';

  constructor(details: SyncFilePrefixInvalidPrefixDetails) {
    super(`Invalid sync file prefix. Expected prefix "${details.expectedPrefix}".`);
  }
}

export class SyncFilePrefixVersionError extends Error {
  override name = 'SyncFilePrefixVersionError';

  constructor(modelVersion: number | string) {
    const formattedModelVersion = String(modelVersion);
    const safeModelVersion =
      formattedModelVersion.length > 40
        ? `${formattedModelVersion.slice(0, 40)}...`
        : formattedModelVersion;
    super(`Invalid sync file model version: ${safeModelVersion}`);
  }
}

const DEFAULT_END_SEPARATOR = '__';
const MODEL_VERSION_PATTERN = /^\d+(?:\.\d+)?$/;
/** Enough head to classify; short enough that no sample is ever retained. */
const HEAD_SAMPLE_LENGTH = 64;
const BASE64_ONLY = /^[A-Za-z0-9+/=]+$/;

const classifyHead = (head: string): SyncFileHeadShape => {
  const trimmed = head.trimStart();
  if (trimmed.startsWith('<')) return 'markup';
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
  return BASE64_ONLY.test(head) ? 'base64' : 'other';
};

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const formatModelVersion = (modelVersion: number): string => {
  const formatted = String(modelVersion);
  if (
    !Number.isFinite(modelVersion) ||
    modelVersion < 0 ||
    !MODEL_VERSION_PATTERN.test(formatted)
  ) {
    throw new SyncFilePrefixVersionError(modelVersion);
  }
  return formatted;
};

const parseModelVersion = (rawModelVersion: string): number => {
  const modelVersion = parseFloat(rawModelVersion);
  if (!Number.isFinite(modelVersion)) {
    throw new SyncFilePrefixVersionError(rawModelVersion);
  }
  return modelVersion;
};

export const createSyncFilePrefixHelpers = ({
  prefix,
  endSeparator = DEFAULT_END_SEPARATOR,
  createInvalidPrefixError,
}: SyncFilePrefixConfig): SyncFilePrefixHelpers => {
  const prefixPattern = escapeRegExp(prefix);
  const separatorPattern = escapeRegExp(endSeparator);
  const prefixRegex = new RegExp(
    `^${prefixPattern}(C)?(E)?(\\d+(?:\\.\\d+)?)${separatorPattern}`,
  );

  return {
    getSyncFilePrefix: (cfg: SyncFilePrefixParams): string => {
      const c = cfg.isCompress ? 'C' : '';
      const e = cfg.isEncrypt ? 'E' : '';
      return `${prefix}${c}${e}${formatModelVersion(cfg.modelVersion)}${endSeparator}`;
    },

    extractSyncFileStateFromPrefix: (dataStr: string): SyncFilePrefixParamsOutput => {
      const match = dataStr.match(prefixRegex);
      if (!match) {
        const head = dataStr.slice(0, HEAD_SAMPLE_LENGTH);
        const details: SyncFilePrefixInvalidPrefixDetails = {
          expectedPrefix: prefix,
          endSeparator,
          inputLength: dataStr.length,
          prefixAt: head.indexOf(prefix),
          headShape: classifyHead(head),
        };
        throw createInvalidPrefixError?.(details) ?? new SyncFilePrefixError(details);
      }

      return {
        isCompressed: !!match[1],
        isEncrypted: !!match[2],
        modelVersion: parseModelVersion(match[3]),
        cleanDataStr: dataStr.slice(match[0].length),
      };
    },
  };
};
