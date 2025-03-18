const PREFIX = 'pf_';
const END_SEPERATOR = '__';

export interface SyncFilePrefixParams {
  isCompressed: boolean;
  isEncrypted: boolean;
  modelVersion: number;
}
export interface SyncFilePrefixParamsOutput extends SyncFilePrefixParams {
  cleanDataStr: string;
}

export const getSyncFilePrefix = (cfg: SyncFilePrefixParams): string => {
  const c = cfg.isCompressed ? 'C' : '';
  const e = cfg.isEncrypted ? 'E' : '';
  return `${PREFIX}${c}${e}${cfg.modelVersion}${END_SEPERATOR}`;
};

export const extractSyncFileStateFromPrefix = (
  dataStr: string,
): SyncFilePrefixParamsOutput => {
  // Modified regex to match decimal numbers
  const match = dataStr.match(
    new RegExp(`^${PREFIX}(C)?(E)?(\\d+(?:\\.\\d+)?)${END_SEPERATOR}`),
  );
  if (!match) {
    throw new Error(`${extractSyncFileStateFromPrefix.name}: Invalid prefix`);
  }

  return {
    isCompressed: !!match[1],
    isEncrypted: !!match[2],
    modelVersion: parseFloat(match[3]), // Changed to parseFloat
    cleanDataStr: dataStr.slice(match[0].length),
  };
};
